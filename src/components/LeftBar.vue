<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {computed, onMounted, ref} from "vue";
import {ArrowDown, Close, MagicStick, Plus, Search, Setting, User} from "@element-plus/icons-vue";
import {addActiveClass, addHoverClass, getTimeString, removeActiveClass, removeHoverClass} from "../util";
import {createConnection, toasterOptions, todo} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {useRouter} from "vue-router";

const chat = useChatStore();
const searchInput = ref("");
const token = ref(-1);
const fetchFlag = ref(false);
const robotList = ref([]), baseModelList = ref([]);
const conn = createConnection();
const toaster = createToaster(toasterOptions);
const router = useRouter();

const showRechargeDialog = ref(false), createBotDialog = ref(false);
const rechargeOptions = ref([
    {price: 6, tokens: 60},
    {price: 30, tokens: 300},
    {price: 98, tokens: 1090},
    {price: 198, tokens: 2240},
    {price: 328, tokens: 3880},
    {price: 648, tokens: 8080},
]);
const createBotData = ref({
    base_model_id: '',
    system_prompt: '',
    knowledge_base: '',
    price: 0,
    quota: 0,
    icon: '',
}), robotIconName = ref('');

onMounted(() => fetcher());
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

// operate message
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
        .catch(err => {
            toaster.show('Failed to query chat list', {type: 'error'});
            chat.chatList = [];
        });
};

const removeChat = (chatid) => {
    conn.delete(`/chat/${chatid}`)
        .then(() => {
            toaster.show('Chat deletion success', {type: 'success'});
            fetcher();
        })
        .catch(err => {
            toaster.show('Failed to delete the chat', {type: 'error'});
        });
};

// operate robots
const getRobots = () => {
    conn.get('/robot')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            robotList.value = data;
        })
        .catch(err => {
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
        .catch(err => {
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


// operate token
const getToken = () => {
    conn.get('/shop/current')
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            token.value = data.current;
        })
        .catch(err => {
            toaster.show('Failed to query token quantity', {type: 'error'});
            token.value = -1;
        });
};
const addToken = () => {
    showRechargeDialog.value = true;
};
const cancelRecharge = () => {
    showRechargeDialog.value = false;
};
const selectRechargeOption = (option) => {
    const newTokenAmount = token.value + option.tokens;
    conn.post('/shop/buy_package', {result: newTokenAmount})
        .then(res => {
            token.value = newTokenAmount;
            showRechargeDialog.value = false;
            toaster.show('Payment success', {type: 'success'});
        })
        .catch(err => {
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
        })
        .catch(err => {
            toaster.show('Chat title update failed', {type: 'error'});
        });
}

function openCreateBotDialog() {
    createBotData.value = {
        base_model_id: '',
        system_prompt: '',
        knowledge_base: '',
        price: 0,
        quota: 0,
        icon: '',
    };
    createBotDialog.value = true;
}

function inputFile(event) {
    robotIconName.value = event.target.files[0].name;
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    fileReader.onload = function (e) {
        createBotData.value.icon = e.target.result as string;
    };
}

function submitBotCreation() {
    let formData = new FormData();
    if (createBotData.value.base_model_id === '' || createBotData.value.system_prompt === '' || createBotData.value.price === 0) {
        toaster.show('Please fill in the required fields', {type: 'warning'});
        return;
    }
    formData.append('base_model_id', createBotData.value.base_model_id);
    formData.append('system_prompt', createBotData.value.system_prompt);
    formData.append('knowledge_base', createBotData.value.knowledge_base);
    formData.append('price', createBotData.value.price.toString());
    formData.append('quota', createBotData.value.quota.toString());
    formData.append('icon', createBotData.value.icon);
    conn.post('/robot/new', formData)
        .then(res => {
            createBotDialog.value = false;
            toaster.show('Bot creation success', {type: 'success'});
            fetcher();
        })
        .catch(err => {
            toaster.show('Bot creation failed', {type: 'error'});
        });
}
</script>


<template>
    <div class="card-header text-left">
        <div class="text-2xl font-bold flex-none grid grid-cols-2">
            <p>Ninja Chat</p>
            <div class="text-right">
                <router-link to="/user" class="mr-2">
                    <el-button :icon="User" circle/>
                </router-link>
                <router-link to="/settings">
                    <el-button :icon="Setting" circle/>
                </router-link>
            </div>
        </div>

        <hr class="mt-3 mb-3"/>
        <div class="w-full">
            <el-input
                v-model="searchInput"
                placeholder="Search for robots or users"
                class="input-with-select" @input="todo"
            >
                <template #prepend>
                    <el-button :icon="Search"/>
                </template>
            </el-input>
            <el-card shadow="none" class="mt-2">
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
            <el-popconfirm title="Are you sure to delete this?" @confirm="removeChat">
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
            Current tokens: {{ token }}
        </div>
        <div class="text-right">
            <el-button @click="addToken">Buy More</el-button>
        </div>
    </div>

    <!-- charge dialog -->
    <el-dialog
        title="Create new bot"
        v-model="createBotDialog"
        width="700px"
        center
    >
        <el-form label-width="auto" v-model="createBotData">
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
                            <el-dropdown-item v-for="item in baseModelList" :key="item.id" :value="item.id"
                                              @click="createBotData.base_model_id = item.id">
                                {{ item.name }}
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
                <p class="text-gray-500 text-xs mt-1">How much NINJA token worth a this robot's token</p>
            </el-form-item>
            <el-form-item label="Quota">
                <el-input v-model="createBotData.quota" type="number"/>
                <p class="text-gray-500 text-xs mt-1">Input the maximum NINJA token the user can use</p>
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

    <!-- charge dialog -->
    <el-dialog
        title="Recharge Tokens"
        v-model="showRechargeDialog"
        width="700px"
        center
    >
        <!-- remain tokens -->
        <div class="text-center mb-4">
            <p class="text-lg font-bold">Current Tokens: {{ token }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4"> <!-- charge options -->
            <el-card
                v-for="(option, index) in rechargeOptions"
                :key="index"
                class="text-center cursor-pointer hover:shadow-lg"
                @click="selectRechargeOption(option)"
            >
                <p class="text-xl font-bold">{{ option.price }}$</p>
                <p class="text-sm text-gray-500">{{ option.tokens }} Tokens</p>
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
