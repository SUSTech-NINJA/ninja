<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {computed, onMounted, ref, watch} from "vue";
import {ArrowDown, Close, MagicStick, Plus, Search, Setting, User} from "@element-plus/icons-vue";
import {addActiveClass, addHoverClass, getTimeString, removeActiveClass, removeHoverClass} from "../util";
import {createConnection, toasterOptions} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {useRoute, useRouter} from "vue-router";
import {useGlobalStore} from '../stores/global';

const chat = useChatStore();
const global = useGlobalStore();
const router = useRouter();
const route = useRoute();

const searchInput = ref("");
const coin = ref(-1);
const fetchFlag = ref(false);
const robotList = ref([] as any[]), baseModelList = ref([] as any[]);
const conn = createConnection();
const toaster = createToaster(toasterOptions);

const showRechargeDialog = ref(false), createBotDialog = ref(false);
const rechargeOptions = ref([
    {price: 6, coins: 60},
    {price: 30, coins: 300},
    {price: 98, coins: 1090},
    {price: 198, coins: 2240},
    {price: 328, coins: 3880},
    {price: 648, coins: 8080},
]);
const createBotData = ref({
    name: '',
    base_model_id: '',
    system_prompt: '',
    knowledge_base: '',
    price: 0,
    quota: 0,
    icon: '',
}), robotIconName = ref('');

const showSearchDialog = ref(false);
const searchType = ref(''); // 'robot' or 'user'
const searchBy = ref(''); // 'id' or 'name' for robots, 'uuid' or 'username' for users
const searchQuery = ref('');
const searchResults = ref([] as any);
const showSearchResultsDialog = ref(false);
const selectedRobot = ref<any>();
const selectedUser = ref<any>();
const showRobotModal = ref(false);
const showUserModal = ref(false);

// 机器人评价相关
const robotRating = ref(0);
const robotComment = ref('');
const showRobotRateModal = ref(false);

// 用户评价相关
const newRating = ref(0);
const showRateDialog = ref(false);

// 用户信息（用于展示用户主页）
const userInfo = ref({
    username: '',
    email: '',
    avatar: '',
    intro: '',
    uuid: '',
    rate: 0,
    filename: '',
});
const robots = ref<any[]>([]);
const posts = ref<any[]>([]);
const isOwnProfile = computed(() => {
    const userId = route.params.userId as string;
    return !userId || userId === global.uuid;
});

// 监听路由变化，获取用户信息
watch(() => route.params.userId, () => {
    fetchUserInfo();
});

onMounted(() => {
    fetcher();
    fetchUserInfo();
});
let lastFetchFlag = false;
chat.$subscribe(() => {
    if (fetchFlag.value !== lastFetchFlag) {
        lastFetchFlag = fetchFlag.value;
    } else fetcher();
});

const fetcher = () => {
    getMessagesList();
    getRobots();
    getToken();
    getBaseModels();
};

// 获取消息列表
const getMessagesList = () => {
    conn.get('/chat')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            chat.chatList = data;
            fetchFlag.value = !fetchFlag.value;
        })
        .catch(_err => {
            toaster.show('Failed to query chat list', {type: 'error'});
            chat.chatList = [];
        });
};

const removeChat = (chatid: any) => {
    conn.delete(`/chat/${chatid}`)
        .then(() => {
            toaster.show('Chat deletion success', {type: 'success'});
            fetcher();
        })
        .catch(_err => {
            toaster.show('Failed to delete the chat', {type: 'error'});
        });
};

// 获取机器人列表
const getRobots = () => {
    conn.get('/robot')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            robotList.value = data;
        })
        .catch(_err => {
            toaster.show('Failed to query robot list', {type: 'error'});
            robotList.value = [];
        });
};
const getBaseModels = () => {
    conn.get('/admin/robot')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            baseModelList.value = data;
        })
        .catch(_err => {
            toaster.show('Failed to query base model list', {type: 'error'});
            baseModelList.value = [];
        });
};
const getBaseModelName = (id: string) => {
    if (baseModelList.value.length === 0 || id === '') return '---';
    return baseModelList.value.find(item => item.id === id)?.name;
};
const getRobotsSlicer = computed(() => {
    return robotList.value.slice(0, 4);
});
const getRobotRest = computed(() => {
    return robotList.value.slice(4);
});

// 获取代币数量
const getToken = () => {
    conn.get('/shop/current')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            coin.value = data.current;
        })
        .catch(_err => {
            toaster.show('Failed to query coin quantity', {type: 'error'});
            coin.value = -1;
        });
};
const addToken = () => {
    showRechargeDialog.value = true;
};
const cancelRecharge = () => {
    showRechargeDialog.value = false;
};
const selectRechargeOption = (option: any) => {
    const newTokenAmount = coin.value + option.coins;
    conn.post('/shop/buy_package', {result: newTokenAmount})
        .then(_res => {
            coin.value = newTokenAmount;
            showRechargeDialog.value = false;
            toaster.show('Payment success', {type: 'success'});
        })
        .catch(_err => {
            toaster.show('Failed to pay', {type: 'error'});
        });
};

function gotoChat() {
    router.push('/');
}

function startChatWithRobot(item: any) {
    let formData = new FormData();
    formData.append('model', item.base_model);
    formData.append('prompts', item.system_prompt);
    conn.post('/chat/new', formData)
        .then(res => {
            fetcher();
            toaster.show('Chat creation success', {type: 'success'});
            chat.current = res.data.chatid;
            gotoChat();
        })
        .catch(_err => {
            toaster.show('Chat creation failed', {type: 'error'});
        });
}

function openCreateBotDialog() {
    createBotData.value = {
        name: '',
        base_model_id: '',
        system_prompt: '',
        knowledge_base: '',
        price: 0,
        quota: 0,
        icon: '',
    };
    createBotDialog.value = true;
}

function inputFile(event: any) {
    robotIconName.value = event.target.files[0].name;
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    fileReader.onload = function (e) {
        createBotData.value.icon = e.target?.result as string;
    };
}

function submitBotCreation() {
    let formData = new FormData();
    if (createBotData.value.base_model_id === '' || createBotData.value.system_prompt === '' || createBotData.value.price === 0) {
        toaster.show('Please fill in the required fields', {type: 'warning'});
        return;
    }
    formData.append('name', createBotData.value.name);
    formData.append('base_model_id', createBotData.value.base_model_id);
    formData.append('system_prompt', createBotData.value.system_prompt);
    formData.append('knowledge_base', createBotData.value.knowledge_base);
    formData.append('price', createBotData.value.price.toString());
    formData.append('quota', createBotData.value.quota.toString());
    formData.append('icon', createBotData.value.icon);
    conn.post('/robot/new', formData)
        .then(_res => {
            createBotDialog.value = false;
            toaster.show('Bot creation success', {type: 'success'});
            fetcher();
        })
        .catch(_err => {
            toaster.show('Bot creation failed', {type: 'error'});
        });
}

// 搜索功能
function openSearchDialog() {
    showSearchDialog.value = true;
}

function performSearch() {
    if (!searchType.value || !searchBy.value || !searchQuery.value) {
        toaster.show('Please complete the search information', {type: 'warning'});
        return;
    }
    let url = '';
    let params = {};
    if (searchType.value === 'robot') {
        url = '/robot/search';
        params = {
            type: searchBy.value === 'id' ? 1 : 2,
            string: searchQuery.value,
        };
    } else if (searchType.value === 'user') {
        url = '/user/search';
        params = {
            type: searchBy.value === 'uuid' ? 1 : 2,
            input: searchQuery.value,
        };
    }
    conn.get(url, {params})
        .then(res => {
            let data: any = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (Array.isArray(data)) {
                searchResults.value = data;
            } else {
                searchResults.value = [data];
            }
            showSearchDialog.value = false;
            showSearchResultsDialog.value = true;
        })
        .catch(_err => {
            toaster.show('Failed to search', {type: 'error'});
        });
}

function handleResultClick(item: any) {
    if (searchType.value === 'robot') {
        getRobotInfo(item.robotid);
    } else if (searchType.value === 'user') {
        getUserInfo(item.uuid);
    }
}

// 获取机器人信息并展示
function getRobotInfo(robotid: string) {
    conn.get(`/robot/${robotid}`)
        .then(res => {
            let data = res.data.info;
            selectedRobot.value = data;
            showRobotModal.value = true;
            showSearchResultsDialog.value = false;
        })
        .catch(_err => {
            toaster.show('Failed to get robot info', {type: 'error'});
        });
}

// 获取用户信息并展示
function getUserInfo(uuid: string) {
    conn.get(`/user/${uuid}`)
        .then(res => {
            let data = res.data;
            selectedUser.value = data;
            // 更新用户信息
            userInfo.value.username = data.UserInfo.name;
            userInfo.value.email = data.UserInfo.email;
            userInfo.value.avatar = data.UserInfo.icon;
            userInfo.value.intro = data.UserInfo.intro;
            userInfo.value.uuid = data.UserInfo.uuid;
            userInfo.value.rate = data.UserInfo.rate;
            robots.value = data.robot ? data.robot.slice(0, 3) : [];
            posts.value = data.post || [];

            showUserModal.value = true;
            showSearchResultsDialog.value = false;
        })
        .catch(_err => {
            toaster.show('Failed to get user info', {type: 'error'});
        });
}

function closeUserModal() {
    showUserModal.value = false;
}

function closeRobotModal() {
    showRobotModal.value = false;
}

function rateRobot() {
    if (robotComment.value.trim() === '' || robotRating.value === 0) {
        toaster.show('Please enter comment and rating', {type: 'warning'});
        return;
    }
    let payload = {
        content: robotComment.value,
        rate: robotRating.value,
        userid: global.uuid,
    };
    conn.post(`/robot/post/${selectedRobot.value?.robotid}`, payload)
        .then(_res => {
            toaster.show('Rating submitted successfully', {type: 'success'});
            robotComment.value = '';
            robotRating.value = 0;
            showRobotRateModal.value = false;
            getRobotInfo(selectedRobot.value?.robotid); // 刷新机器人信息
        })
        .catch(_err => {
            toaster.show('Failed to submit rating', {type: 'error'});
        });
}

function rateUser() {
    if (newRating.value === 0) {
        toaster.show('Please give a rating', {type: 'warning'});
        return;
    }
    if (userInfo.value.uuid === global.uuid) {
        toaster.show('You cannot rate yourself', {type: 'warning'});
        return;
    }
    conn.post(`/evaluate_user/${userInfo.value.uuid}`, {
        rate: newRating.value,
    })
        .then(_res => {
            toaster.show('Rating sent successfully', {type: 'success'});
            showRateDialog.value = false;
            getUserInfo(userInfo.value.uuid); // 刷新用户信息
        })
        .catch(_err => {
            toaster.show('Failed to send rating', {type: 'error'});
        });
}

// 导航到用户主页
function goToUserProfile() {
    closeUserModal();
    // 导航到 /user/:userId 路径
    router.push({path: `/user/${userInfo.value.uuid}`});
}

// 获取用户信息，用于展示用户主页
async function fetchUserInfo() {
    try {
        const userId = (route.params.userId as string) || global.uuid;
        const response = await conn.get(`/user/${userId}`);
        if (response.status === 200) {
            const data = response.data;
            userInfo.value.username = data.UserInfo.name;
            userInfo.value.email = data.UserInfo.email;
            userInfo.value.avatar = data.UserInfo.icon;
            userInfo.value.intro = data.UserInfo.intro;
            userInfo.value.uuid = data.UserInfo.uuid;
            userInfo.value.rate = data.UserInfo.rate;
            robots.value = data.robot ? data.robot.slice(0, 3) : [];
            posts.value = data.post || [];
        }
    } catch (error) {
        toaster.show('Failed to fetch user info', {type: 'error'});
    }
}
</script>


<template>
    <div class="card-header text-left">
        <div class="text-2xl font-bold flex-none grid grid-cols-2">
            <p>Ninja Chat</p>
            <div class="text-right">
                <el-button :icon="Search" class="mr-2" circle @click="openSearchDialog"/>
                <router-link to="/user" class="mr-2">
                    <el-button :icon="User" circle/>
                </router-link>
                <router-link to="/settings">
                    <el-button :icon="Setting" circle/>
                </router-link>
            </div>
        </div>

        <hr class="mt-3 mb-3"/>
        <el-card shadow="never" class="mt-2">
            <div class="flex-none w-full text-left">
                <p class="font-bold">Start chat with</p>
                <div class="grid grid-cols-1 xl:grid-cols-2">
                    <div v-for="item in getRobotsSlicer"
                         class="text-xs el-select-dropdown__item h-fit mt-0.5 p-1 pl-0.5"
                         v-on:mouseenter="addHoverClass"
                         v-on:mouseleave="removeHoverClass" v-on:mousedown="addActiveClass"
                         v-on:mouseup="removeActiveClass" @click="startChatWithRobot(item)">
                        - {{ item?.robot_name }}
                    </div>
                    <el-dropdown placement="bottom" class="!w-full" :disabled="robotList.length < 5">
                        <div
                            class="text-xs el-select-dropdown__item h-fit mt-0.5 p-1 pl-0.5"
                            v-on:mouseenter="addHoverClass"
                            v-on:mouseleave="removeHoverClass" v-on:mousedown="addActiveClass"
                            v-on:mouseup="removeActiveClass">
                            - More ...
                        </div>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item v-for="item in getRobotRest" @click="startChatWithRobot(item)">
                                    {{ item?.robot_name }}
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
        </el-card>
        <div class="grid grid-cols-2">
            <div class="pr-1">
                <el-button class="w-full mt-2" @click="openCreateBotDialog">
                    <el-icon>
                        <Plus/>
                    </el-icon>
                    <span class="ml-2">Create bot</span>
                </el-button>
            </div>

            <div class="pl-1">
                <router-link to="/discovery">
                    <el-button class="w-full mt-2">
                        <el-icon>
                            <MagicStick/>
                        </el-icon>
                        <span class="ml-2">Discovery</span>
                    </el-button>
                </router-link>
            </div>

        </div>
        <hr class="mt-3 mb-3 col-span-2"/>
    </div>
    <div class="grow mt-1 mb-4 overflow-scroll">
        <div class="w-full h-full flex items-center" v-if="chat.chatList.length === 0">
            <div class="h-fit w-full text-gray-500">
                No chat available.
            </div>
        </div>
        <el-card v-for="item in chat.chatList" shadow="hover" class="mb-3 relative"
                 :class="{'!border-[1px] !border-blue-500': chat.current === item.chatid}"
                 @click="chat.current = item.chatid; fetchFlag = !fetchFlag; gotoChat()">
            <div class="flex-none w-full text-left">
                <p class="text-normal mb-1">{{ item.title }}</p>
                <p class="text-xs">{{ getTimeString(item.time) }}</p>
            </div>
            <el-popconfirm title="Are you sure to delete this?" @confirm="() => removeChat(item.chatid)">
                <template #reference>
                    <a class="absolute top-2 right-2">
                        <el-icon>
                            <Close/>
                        </el-icon>
                    </a>
                </template>
            </el-popconfirm>
        </el-card>
    </div>

    <div class="flex-none w-full grid grid-cols-2 items-center">
        <div class="text-left text-sm fit-content">
            Current coins: {{ coin }}
        </div>
        <div class="text-right">
            <el-button @click="addToken">Buy More</el-button>
        </div>
    </div>

    <!-- Search Dialog -->
    <el-dialog
        title="Search"
        v-model="showSearchDialog"
        width="400px"
        center
    >
        <el-form>
            <el-form-item label="Search for">
                <el-radio-group v-model="searchType">
                    <el-radio label="robot">Robot</el-radio>
                    <el-radio label="user">User</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item v-if="searchType === 'robot'" label="Search by">
                <el-radio-group v-model="searchBy">
                    <el-radio label="id">Robot ID</el-radio>
                    <el-radio label="name">Robot Name</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item v-if="searchType === 'user'" label="Search by">
                <el-radio-group v-model="searchBy">
                    <el-radio label="uuid">User UUID</el-radio>
                    <el-radio label="username">Username</el-radio>
                </el-radio-group>
            </el-form-item>
            <el-form-item label="Search query">
                <el-input v-model="searchQuery" placeholder="Enter your search query"/>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="performSearch">Search</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>

    <!-- Search Results Dialog -->
    <el-dialog
        title="Search Results"
        v-model="showSearchResultsDialog"
        width="600px"
        center
    >
        <div v-if="searchResults.length === 0">
            No results found.
        </div>
        <div v-else>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="item in searchResults.slice(0, 3)" :key="item.uuid || item.robotid" class="cursor-pointer"
                     @click="handleResultClick(item)">
                    <el-card shadow="hover">
                        <div class="text-center">
                            <el-avatar :src="item.icon" size="large"/>
                            <p>{{ item.name || item.robot_name }}</p>
                            <p>ID: {{ item.uuid || item.robotid }}</p>
                            <el-rate :model-value="item.rate" disabled></el-rate>
                        </div>
                    </el-card>
                </div>
            </div>
        </div>
    </el-dialog>

    <!-- Robot Details Modal -->
    <el-dialog
        v-model="showRobotModal"
        :title="selectedRobot && selectedRobot.robot_name"
        width="30%"
    >
        <template #default>
            <el-avatar
                :src="selectedRobot && selectedRobot.icon"
                size="large"
                class="mb-4"
            />
            <div class="text-left">
                <p><strong>Model:</strong> {{ selectedRobot && selectedRobot.base_model }}</p>
                <p><strong>Price:</strong> {{ selectedRobot && selectedRobot.price }}</p>
                <p>
                    <strong>System Prompt:</strong>
                    {{
                        selectedRobot &&
                        selectedRobot.system_prompt.substring(0, 50) + '...'
                    }}
                </p>
                <p><strong>Creator:</strong> {{ selectedRobot && selectedRobot.creator }}</p>
                <p><strong>Quota:</strong> {{ selectedRobot && selectedRobot.quota }}</p>
                <p>
                    <strong>Knowledge Base:</strong>
                    {{
                        selectedRobot && selectedRobot.knowledge_base
                            ? selectedRobot.knowledge_base.substring(0, 50) + '...'
                            : 'N/A'
                    }}
                </p>
                <p><strong>Users:</strong> {{ selectedRobot && selectedRobot.population }}</p>
                <div class="flex items-center">
                    <p><strong>Rating:</strong></p>
                    <el-rate :model-value="selectedRobot && selectedRobot.rate" disabled allow-half/>
                </div>
            </div>
        </template>
        <template #footer>
            <el-button @click="showRobotRateModal = true">
                Rate this robot
            </el-button>
        </template>
    </el-dialog>

    <!-- Robot Rating Modal -->
    <el-dialog
        v-model="showRobotRateModal"
        title="Rate Robot"
        width="30%"
    >
        <el-input
            type="textarea"
            v-model="robotComment"
            placeholder="Enter your comment"
            class="mb-4"
        />
        <div class="flex items-center justify-center mb-4">
            <span class="mr-2">Rating:</span>
            <el-rate v-model="robotRating" allow-half/>
        </div>
        <div class="text-center">
            <el-button @click="rateRobot" type="primary">Submit</el-button>
        </div>
    </el-dialog>

    <!-- User Details Modal -->
    <el-dialog
        v-model="showUserModal"
        :title="selectedUser && selectedUser.UserInfo.name + ' Profile'"
        width="40%"
    >
        <div class="text-center">
            <el-avatar :src="selectedUser && selectedUser.UserInfo.icon" size="large"/>
            <p><strong>Username:</strong> {{ selectedUser && selectedUser.UserInfo.name }}</p>
            <p><strong>ID:</strong> {{ selectedUser && selectedUser.UserInfo.uuid }}</p>
            <p><strong>Intro:</strong> {{ selectedUser && selectedUser.UserInfo.intro }}</p>
            <p><strong>Rate:</strong>
                <el-rate :model-value="selectedUser && selectedUser.UserInfo.rate" disabled allow-half></el-rate>
            </p>
        </div>
        <template #footer>
            <el-button @click="showRateDialog = true">Rate user</el-button>
            <el-button @click="goToUserProfile">Go to Profile</el-button>
        </template>
    </el-dialog>

    <!-- User Rating Dialog -->
    <el-dialog
        v-model="showRateDialog"
        title="Rate User"
        width="30%"
    >
        <div class="flex items-center justify-center mb-4">
            <span class="mr-2">Rating:</span>
            <el-rate v-model="newRating" allow-half/>
        </div>
        <div class="text-center">
            <el-button @click="rateUser" type="primary">Submit Rate</el-button>
        </div>
    </el-dialog>

    <!-- Create Bot Dialog -->
    <el-dialog
        title="Create new bot"
        v-model="createBotDialog"
        width="700px"
        center
    >
        <el-form label-width="auto" v-model="createBotData">
            <el-form-item lebel="Name" required>
                <el-input v-model="createBotData.name" placeholder="Input your bot name"/>
            </el-form-item>
            <el-form-item label="Base Model" required>
                <el-dropdown>
                    <span class="el-dropdown-link select-none">
                      {{ getBaseModelName(createBotData.base_model_id) }}
                      <el-icon class="el-icon--right">
                        <arrow-down/>
                      </el-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu slot="dropdown">
                            <el-dropdown-item v-for="item in baseModelList" :key="(item as any).id"
                                              :value="(item as any).id"
                                              @click="createBotData.base_model_id = (item as any).id">
                                {{ (item as any).name }}
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </el-form-item>
            <el-form-item label="System Prompt" required>
                <el-input v-model="createBotData.system_prompt" type="textarea"
                          placeholder="Input your system prompt here" :autosize="{ minRows: 3, maxRows: 8 }"/>
            </el-form-item>
            <el-form-item label="Knowledge Base">
                <el-input v-model="createBotData.knowledge_base" placeholder="Input knowledge base id here"/>
            </el-form-item>
            <el-form-item label="Price" required>
                <el-input v-model="createBotData.price" type="number"/>
                <p class="text-gray-500 text-xs mt-1">How much NINJA coin worth 1000 this robot's token</p>
            </el-form-item>
            <el-form-item label="Quota">
                <el-input v-model="createBotData.quota" type="number"/>
                <p class="text-gray-500 text-xs mt-1">Input the maximum NINJA coin the user can use</p>
            </el-form-item>
            <el-form-item label="Icon">
                <el-button>
                    Select a file
                    <input type="file" v-on:change="inputFile" accept="image/*"
                           class="opacity-0 absolute top-0 right-0 left-0 bottom-0 !cursor-pointer"/>
                </el-button>
                <span class="ml-2.5 text-gray-500">{{ robotIconName }}</span>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer text-right">
                <el-button @click="createBotDialog = false">Cancel</el-button>
                <el-button type="primary" @click="submitBotCreation">
                    Confirm
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Recharge Dialog -->
    <el-dialog
        title="Recharge Coins"
        v-model="showRechargeDialog"
        width="700px"
        center
    >
        <!-- remain coins -->
        <div class="text-center mb-4">
            <p class="text-lg font-bold">Current Coins: {{ coin }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4"> <!-- charge options -->
            <el-card
                v-for="(option, index) in rechargeOptions"
                :key="index"
                class="text-center cursor-pointer hover:shadow-lg"
                @click="selectRechargeOption(option)"
            >
                <p class="text-xl font-bold">{{ option.price }}$</p>
                <p class="text-sm text-gray-500">{{ option.coins }} Coins</p>
            </el-card>
        </div>

        <div class="text-right mt-6">
            <el-button @click="cancelRecharge">Cancel Recharge</el-button>
        </div>
    </el-dialog>
</template>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
</style>
