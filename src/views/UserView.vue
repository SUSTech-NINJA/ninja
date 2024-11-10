<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {
    ElAvatar,
    ElButton,
    ElCard,
    ElDialog,
    ElForm,
    ElFormItem,
    ElIcon,
    ElInput,
    ElMessage,
    ElRate,
    ElScrollbar,
} from 'element-plus';
import {ChatDotRound, Close} from '@element-plus/icons-vue';
import {useGlobalStore} from '../stores/global';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import dayjs from 'dayjs';
import {getTimeString} from "../util";
import {createConnection} from "../config";

const global = useGlobalStore();
const router = useRouter();
const route = useRoute();
const editMode = ref(false); // Toggle user info edit mode
const showRobotModal = ref(false); // Toggle robot details modal
const showMessagesModal = ref(false); // Toggle messages list modal
const showPostModal = ref(false); // Toggle post details modal
const selectedPost = ref<any>(null), selectedPostId = ref<number>(); // Currently selected post data
const selectedRobot = ref<any>(null), selectedRobotId = ref<number>(); // Currently selected robot data
const robots = ref<any[]>([]); // Robot list
const userInfo = ref({
    username: '',
    email: '',
    avatar: '', // User avatar
    intro: '', // User introduction
    uuid: '',
    rate: 0,
    filename: '',
});
const isOwnProfile = computed(() => {
    const userId = route.params.userId as string;
    return !userId || userId === global.uuid;
});

// Variables for new comment and rating
const newComment = ref('');
const newRating = ref(0);

// New posts content
const newPostContent = ref('');

// List of published posts
const posts = ref<any[]>([]);

// Messages list
const messages = ref<any[]>([]);

// Chat history
const chatHistory = ref<any[]>([]);
const showChatHistoryModal = ref(false);
const chatWithUser = ref('');
const chatReplyContent = ref('');

// Current user's information
const currentUserInfo = ref({
    username: '',
    avatar: '',
});

// Variables for robot rating
const robotRating = ref(0);
const robotComment = ref('');
const showRobotRateModal = ref(false);

// Dialog visibility
const showPostDialog = ref(false);
const showMessageDialog = ref(false);
const showRateDialog = ref(false); // Added for user rating dialog

// Axios instance with base config and request interceptor
const api = createConnection();

// Fetch user info, posts, and robot list
async function fetchUserInfo() {
    try {
        const userId = (route.params.userId as string) || global.uuid;
        const response = await api.get(`/user/${userId}`, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            const data = response.data;
            userInfo.value.username = data.UserInfo.name;
            userInfo.value.email = data.UserInfo.email;
            userInfo.value.avatar = data.UserInfo.icon;
            userInfo.value.intro = data.UserInfo.intro;
            userInfo.value.uuid = data.UserInfo.uuid;
            userInfo.value.rate = data.UserInfo.rate;
            robots.value = data.robot ? data.robot.slice(0, 3) : []; // Only show 3 robots
            posts.value = data.post || [];
            selectedPost.value = posts.value[selectedPostId.value as any];

        }
    } catch (error) {
        ElMessage.error('Failed to fetch user info');
    }
}

async function fetchPosts() {
    try {
        const userId = (route.params.userId as string) || global.uuid;
        const response = await api.get(`/user/${userId}`, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            const data = response.data;
            posts.value = data.post || [];
            selectedPost.value = posts.value[selectedPostId.value as any];
        }
    } catch (error) {
        ElMessage.error('Failed to fetch posts');
    }
}

// Fetch current user's info
async function fetchCurrentUserInfo() {
    try {
        const response = await api.get(`/user/${global.uuid}`, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            const data = response.data;
            currentUserInfo.value.username = data.UserInfo.name;
            currentUserInfo.value.avatar = data.UserInfo.icon;
        }
    } catch (error) {
        ElMessage.error('Failed to fetch current user info');
    }
}

// Update user info
async function updateUserInfo() {
    try {
        const formData = new FormData();
        formData.append('Username', userInfo.value.username);
        formData.append('intro', userInfo.value.intro);
        formData.append('Email', userInfo.value.email);
        formData.append('icon', userInfo.value.avatar); // Using base64 data
        formData.append('uuid', global.uuid);

        const response = await api.post('/update/1', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': 'Bearer ' + global.token
            }
        });

        if (response.status === 200) {
            ElMessage.success('User info updated successfully');
            editMode.value = false;
        } else {
            ElMessage.error('Failed to update user info');
        }
    } catch (error) {
        ElMessage.error('Failed to update user info');
    }
}

// Open messages
async function fetchMessages() {
    try {
        const response = await api.get(`/conversation/${global.uuid}`, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            const data = response.data;
            messages.value = data.conversation_list || [];
        }
    } catch (error) {
        ElMessage.error('Failed to fetch messages list');
    }
}

async function openMessages() {
    await fetchMessages();
    showMessagesModal.value = true;
}

// View chat history
async function viewChatHistory(message: any) {
    try {
        const response = await api.get(`/get_history/${message.userid}`, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            const data = response.data;
            chatHistory.value = data.history || [];
            showChatHistoryModal.value = true;
            chatWithUser.value = message.userid;
        }
    } catch (error) {
        ElMessage.error('Failed to fetch chat history');
    }
}

// Send chat reply
async function sendChatReply() {
    if (chatReplyContent.value.trim() === '') {
        ElMessage.warning('Reply content cannot be empty');
        return;
    }
    try {
        let formData = new FormData();
        formData.append('content', chatReplyContent.value);
        formData.append('uuid', global.uuid);
        const response = await api.post('/send_message', payload, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            ElMessage.success('Message sent successfully');
            chatReplyContent.value = '';
            // Refresh chat history
            await viewChatHistory({userid: chatWithUser.value});
        } else {
            ElMessage.error('Failed to send message');
        }
    } catch (error) {
        ElMessage.error('Failed to send message');
    }
}

// Publish post
async function publishPost() {
    if (newPostContent.value.trim() === '') {
        ElMessage.warning('Post content cannot be empty');
        return;
    }
    try {
        let formData = new FormData();
        formData.append('content', newPostContent.value);
        formData.append('icon', currentUserInfo.value.avatar);
        formData.append('uuid', global.uuid);
        formData.append('name',currentUserInfo.value.username);
        const response = await api.post('/post', formData, {
            headers: {'Authorization': 'Bearer ' + global.token}
        });
        if (response.status === 200) {
            ElMessage.success('Post published successfully');
            newPostContent.value = '';
            showPostDialog.value = false;
            await fetchPosts();
        } else {
            ElMessage.error('Failed to publish post');
        }
    } catch (error) {
        ElMessage.error('Failed to publish post');
    }
}

// Send a private post message
async function sendPrivateMessage(mode: string) {
    if (newComment.value.trim() === '') {
        ElMessage.warning('Content cannot be empty');
        return;
    }
    try {
        let formData = new FormData();
        formData.append('content', newComment.value);
        formData.append('icon', currentUserInfo.value.avatar);
        formData.append('uuid', global.uuid);
        formData.append('username',currentUserInfo.value.username);
        formData.append('postid', selectedPostId.value);
        api.post('/response',{
            data : formData,
        },{
            headers: {'Authorization': 'Bearer ' + global.token}
        })
            .then(res => {
                ElMessage.success('Message sent successfully');
                newComment.value = '';
                fetchUserInfo();

            })
            .catch(err => {
                ElMessage.error('Failed to send message');
        })

    } catch (error) {
        ElMessage.error('Failed to send message');
    }
}

// Rate user
async function rateUser() {
    if (newRating.value === 0) {
        ElMessage.warning('Please give a rating');
        return;
    }
    if (userInfo.value.uuid === global.uuid) {
        ElMessage.warning('You cannot rate yourself');
        return;
    }
    try {
        const response = await api.post(
            `/evaluate_user/${userInfo.value.uuid}`,
            {
                rate: newRating.value,
            }, {
                headers: {'Authorization': 'Bearer ' + global.token}
            }
        );
        if (response.status === 200) {
            ElMessage.success('Rating sent successfully');
            showRateDialog.value = false;
            newRating.value = 0;
        } else {
            ElMessage.error('Failed to send rating');
        }
    } catch (error) {
        ElMessage.error('Failed to send rating');
    }
}

// Send robot rating
async function sendRobotRating() {
    if (robotComment.value.trim() === '' || robotRating.value === 0) {
        ElMessage.warning('Please enter comment and rating');
        return;
    }
    try {
        const payload = {
            content: robotComment.value,
            rate: robotRating.value,
            userid: global.uuid,
        };
        const response = await api.post(
            `/robot/post/${selectedRobot.value.robotid}`,
            payload,
            {headers: {'Authorization': 'Bearer ' + global.token}}
        );
        if (response.status === 200) {
            ElMessage.success('Rating submitted successfully');
            robotComment.value = '';
            robotRating.value = 0;
            showRobotRateModal.value = false;
            // Refresh robot info
            await fetchUserInfo();
        } else {
            ElMessage.error('Failed to submit rating');
        }
    } catch (error) {
        ElMessage.error('Failed to submit rating');
    }
}

// Toggle user info edit mode
function toggleEditMode() {
    editMode.value = !editMode.value;
}

// Show robots detail modal
function openRobotModal(robotId: any) {
    selectedRobot.value = robots.value[robotId];
    selectedRobotId.value = robotId;
    showRobotModal.value = true;
    robotComment.value = '';
    robotRating.value = 0;
}

// Show posts detail modal
function openPostModal(postId: any) {
    selectedPost.value = posts.value[postId];
    selectedPostId.value = postId;
    showPostModal.value = true;
}

// Handle logout
function logOut() {
    router.push('/');
    global.notLogin = true;
    global.uuid = '';
    global.token = '';
}

function inputFile(event: any) {
    userInfo.value.filename = event.target.files[0].name;
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    fileReader.onload = function (e) {
        userInfo.value.avatar = e.target?.result as any;
    };
}

// Page initialization
onMounted(() => {
    if (!global.token) {
        router.push('/');
    }
    fetchUserInfo();
    fetchCurrentUserInfo();
});
</script>

<template>
    <div class="p-6 w-full h-full overflow-auto">
        <!-- Header area -->
        <div class="grid grid-cols-3 w-full mb-4 items-center">
            <div class="col-span-2 text-left">
                <h1 class="text-2xl font-bold">
                    {{ isOwnProfile ? 'My Homepage' : userInfo.username + "'s Homepage" }}
                </h1>
            </div>
            <div class="text-right flex items-center justify-end">
                <a @click="openMessages" class="cursor-pointer mr-4">
                    <ElIcon>
                        <ChatDotRound/>
                    </ElIcon>
                </a>
                <RouterLink to="/">
                    <ElIcon>
                        <Close/>
                    </ElIcon>
                </RouterLink>
            </div>
        </div>

        <!-- User Info Section -->
        <div class="mb-4">
            <div v-if="!editMode">
                <div class="flex flex-row justify-center">
                    <ElAvatar :src="userInfo.avatar" size="large" class="mb-4"/>
                    <div class="text-left ml-4">
                        <p><strong>Username:</strong> {{ userInfo.username }}</p>
                        <p><strong>Intro:</strong> {{ userInfo.intro }}</p>
                        <p v-if="isOwnProfile"><strong>Email:</strong> {{ userInfo.email }}</p>
                        <p><strong>Rate:</strong>
                            <ElRate :model-value="userInfo.rate" disabled allow-half/>
                        </p>
                    </div>
                </div>
            </div>
            <div v-else>
                <ElForm label-width="auto">
                    <ElFormItem label="Avatar">
                        <ElAvatar :src="userInfo.avatar"/>
                        <!-- Use input[type="file"] to upload files -->
                        <ElButton class="ml-2">
                            Select File
                            <input
                                type="file"
                                @change="inputFile"
                                class="opacity-0 absolute top-0 right-0 left-0 bottom-0 cursor-pointer"
                            />
                        </ElButton>
                        <span class="ml-2.5 text-gray-500">{{ userInfo.filename }}</span>
                    </ElFormItem>
                    <ElFormItem label="Username">
                        <ElInput
                            v-model="userInfo.username"
                            placeholder="Enter Username"
                            class="mb-4"
                        />
                    </ElFormItem>
                    <ElFormItem label="Intro">
                        <ElInput
                            v-model="userInfo.intro"
                            placeholder="Enter Intro"
                            class="mb-4"
                        />
                    </ElFormItem>
                    <ElFormItem label="Email">
                        <ElInput
                            v-model="userInfo.email"
                            placeholder="Enter Email"
                            class="mb-4"
                        />
                    </ElFormItem>
                    <ElButton @click="updateUserInfo" type="success">
                        Save
                    </ElButton>
                </ElForm>
            </div>
        </div>

        <!-- Interaction Section -->
        <div class="mb-8">
            <div v-if="isOwnProfile">
                <div class="flex justify-center space-x-4">
                    <ElButton type="primary" @click="showPostDialog = true">Create Post</ElButton>
                    <ElButton @click="toggleEditMode" type="primary">Edit Info</ElButton>
                </div>
                <!-- Post Dialog -->
                <ElDialog
                    v-model="showPostDialog"
                    title="Create Post"
                    width="30%"
                >
                    <ElInput
                        type="textarea"
                        v-model="newPostContent"
                        placeholder="Enter post content"
                        class="mb-4"
                    />
                    <div class="text-center">
                        <ElButton @click="publishPost" type="primary">Send</ElButton>
                    </div>
                </ElDialog>
            </div>
            <div v-else>
                <div class="flex justify-center space-x-4">
                    <ElButton @click="showPostDialog = true" type="primary">
                        Create Post
                    </ElButton>
                    <ElButton @click="showMessageDialog = true" type="success">
                        Send Message
                    </ElButton>
                    <ElButton @click="showRateDialog = true" type="primary">
                        Rate
                    </ElButton>
                </div>
                <!-- Post Dialog -->
                <ElDialog
                    v-model="showPostDialog"
                    title="Create Post"
                    width="30%"
                >
                    <ElInput
                        type="textarea"
                        v-model="newPostContent"
                        placeholder="Enter post content"
                        class="mb-4"
                    />
                    <div class="text-center">
                        <ElButton @click="publishPost" type="primary">Send</ElButton>
                    </div>
                </ElDialog>
                <!-- Message Dialog -->
                <ElDialog
                    v-model="showMessageDialog"
                    title="Send Message"
                    width="30%"
                >
                    <ElInput
                        type="textarea"
                        v-model="newComment"
                        placeholder="Enter message content"
                        class="mb-4"
                    />
                    <div class="text-center">
                        <ElButton @click="sendPrivateMessage('message')" type="primary">
                            Send
                        </ElButton>
                    </div>
                </ElDialog>
                <!-- Rate Dialog -->
                <ElDialog
                    v-model="showRateDialog"
                    title="Rate User"
                    width="30%"
                >
                    <div class="flex items-center justify-center mb-4">
                        <span class="mr-2">Rating:</span>
                        <ElRate v-model="newRating" allow-half/>
                    </div>
                    <div class="text-center">
                        <ElButton @click="rateUser" type="primary">Submit Rate</ElButton>
                    </div>
                </ElDialog>
            </div>
        </div>

        <!-- Robots Section -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">Robots</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <ElCard
                    v-for="(robot, index) in robots"
                    :key="index"
                    shadow="hover"
                    @click="openRobotModal(index)"
                    class="text-left"
                >
                    <div class="flex items-center mb-4">
                        <ElAvatar :src="robot.icon" size="large"/>
                        <h4 class="text-lg font-semibold ml-4">{{ robot.robot_name }}</h4>
                    </div>
                    <p><b>Model:</b> {{ robot.base_model }}</p>
                    <p><b>Price:</b> {{ robot.price }}</p>
                    <p><b>Users:</b> {{ robot.population }}</p>
                    <div class="flex items-center">
                        <b>Rating:</b>
                        <ElRate :model-value="robot.rate" disabled allow-half class="ml-1"/>
                    </div>
                </ElCard>
            </div>
        </div>

        <!-- Posts Section -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">Posts</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <ElCard v-for="(post, index) in posts" :key="index" class="mb-4" shadow="hover"
                        @click="openPostModal(index)">
                    <div class="flex items-center mb-2">
                        <ElAvatar :src="post.icon" size="small"/>
                        <span class="ml-2">{{ post.username }}</span>
                        <span class="ml-auto text-gray-500">{{ getTimeString(post.time) }}</span>
                    </div>
                    <p class="text-left text-gray-700">{{ post.content }}</p>
                    <div v-if="post.type === 'rate'" class="mt-1">
                        <ElRate :model-value="post.rate" disabled allow-half class="ml-1"/>
                    </div>
                </ElCard>
            </div>
        </div>

        <!-- Logout Button -->
        <div v-if="isOwnProfile" class="w-full text-center mt-8">
            <ElButton @click="logOut">Logout</ElButton>
        </div>

        <!-- Post Details Modal -->
        <ElDialog
            v-model="showPostModal"
            :title="selectedPost && ('Post #' + selectedPost.postid)"
            width="50%"
        >
            <template #default>
                <div class="flex flex-row">
                    <div class="ml-2.5 text-left flex flex-col">
                        <div>
                            <ElAvatar :src="selectedPost && selectedPost.icon" size="large"/>
                        </div>
                        <div class="w-20">
                            <b>{{ selectedPost && selectedPost.username }}</b><br/>
                            <p class="text-xs">{{ selectedPost && selectedPost.time }}</p>
                        </div>
                    </div>
                    <div class="text-left ml-2 p-4 border-gray-300 border-l-[1px] flex-grow bg-gray-50">
                        {{ selectedPost && selectedPost.content }}
                    </div>
                </div>
                <hr class="mt-2"/>
                <div class="relative overflow-scroll max-h-[320px]">
                    <div v-for="(response, index) in selectedPost.responses" class="flex flex-row mt-4">
                        <div class="ml-2.5 text-left flex flex-col">
                            <div>
                                <ElAvatar :src="response.icon" size="large"/>
                            </div>
                            <div class="w-20">
                                <b>{{ response.username }}</b><br/>
                                <p class="text-xs">{{ response.time }}</p>
                            </div>
                        </div>
                        <div class="text-left ml-2 p-4 border-gray-300 border-l-[1px] flex-grow"
                             :class="{'bg-blue-50': index % 2 === 0, 'bg-neutral-50': index % 2 === 1}">
                            {{ response.content }}
                        </div>
                    </div>
                </div>
                <div>
                    <ElInput
                        type="textarea"
                        v-model="newComment"
                        placeholder="Enter your comment"
                        :autosize="{minRows: 3, maxRows: 5}"
                        class="mt-4"
                    />
                    <div class="text-right mt-2">
                        <ElButton @click="sendPrivateMessage('post')" type="primary">Reply</ElButton>
                    </div>
                </div>
            </template>
        </ElDialog>

        <!-- Robot Details Modal -->
        <ElDialog
            v-model="showRobotModal"
            :title="selectedRobot && selectedRobot.robot_name"
            width="30%"
        >
            <template #default>
                <ElAvatar
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
                        <ElRate :model-value="selectedRobot && selectedRobot.rate" disabled allow-half/>
                    </div>
                </div>
            </template>
            <template #footer>
                <ElButton @click="showRobotRateModal = true">
                    Rate this robot
                </ElButton>
            </template>
        </ElDialog>

        <!-- Robot Rating Modal -->
        <ElDialog
            v-model="showRobotRateModal"
            title="Rate Robot"
            width="30%"
        >
            <ElInput
                type="textarea"
                v-model="robotComment"
                placeholder="Enter your comment"
                class="mb-4"
            />
            <div class="flex items-center justify-center mb-4">
                <span class="mr-2">Rating:</span>
                <ElRate v-model="robotRating" allow-half/>
            </div>
            <div class="text-center">
                <ElButton @click="sendRobotRating" type="primary">Submit</ElButton>
            </div>
        </ElDialog>

        <!-- Messages List Modal -->
        <ElDialog
            v-model="showMessagesModal"
            title="Messages"
            width="50%"
        >
            <template #default>
                <div class="flex">
                    <!-- Left user list -->
                    <div class="w-1/3 pr-4 border-r">
                        <ElScrollbar height="400px">
                            <div
                                v-for="(message, index) in messages"
                                :key="index"
                                class="mb-4 cursor-pointer"
                                @click="viewChatHistory(message)"
                            >
                                <div class="flex items-center">
                                    <ElAvatar :src="message.icon" size="small"/>
                                    <span class="ml-2">{{ message.userid }}</span>
                                </div>
                            </div>
                        </ElScrollbar>
                    </div>
                    <!-- Right chat history -->
                    <div class="w-2/3 pl-4">
                        <ElScrollbar height="400px">
                            <div
                                v-for="(chat, index) in chatHistory"
                                :key="index"
                                class="mb-4"
                            >
                                <div class="flex items-center mb-2">
                                    <ElAvatar :src="chat.icon" size="small"/>
                                    <span class="ml-2">{{ chat.sender }}</span>
                                    <span class="ml-auto text-gray-500">
                                        {{chat.timestamp}}
                                </span>
                                </div>
                                <el-card shadow="never" class="ml-3 mr-3 text-sm w-fit user-dialog-chat"
                                         :class="chat.sender === global.uuid ? 'bg-blue-50' : 'bg-neutral-50'">
                                    {{ chat.content }}
                                </el-card>
                            </div>
                        </ElScrollbar>
                        <!-- Reply input box -->
                        <div class="text-right">
                            <ElInput
                                type="textarea"
                                v-model="chatReplyContent"
                                placeholder="Enter reply content"
                                class="mt-4"
                            />
                            <ElButton type="primary" @click="sendChatReply" class="mt-2">
                                Send
                            </ElButton>
                        </div>
                    </div>
                </div>
            </template>
        </ElDialog>
    </div>
</template>

<style scoped>
.el-scrollbar {
    height: auto !important;
}

.flex-center {
    display: flex;
    justify-content: center;
    align-items: center;
}

.el-dialog__wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
}

.el-rate {
    height: fit-content;
}
</style>
