<script setup lang="ts">
import {ref, onMounted, computed} from 'vue';
import axios from 'axios';
import {
    ElCard,
    ElDialog,
    ElButton,
    ElInput,
    ElRate,
    ElIcon,
    ElAvatar,
    ElMessage,
    ElScrollbar,
    ElForm,
    ElFormItem,
} from 'element-plus';
import {Close, ChatDotRound} from '@element-plus/icons-vue';
import {useGlobalStore} from '../stores/global';
import {useRouter, useRoute, RouterLink} from 'vue-router';
import dayjs from 'dayjs';

const global = useGlobalStore();
const router = useRouter();
const route = useRoute();
const userRateMod5 = computed(() => userInfo.value.rate % 5);
const editMode = ref(false); // Toggle user info edit mode
const showRobotModal = ref(false); // Toggle robot details modal
const showMessagesModal = ref(false); // Toggle messages list modal
const selectedRobot = ref<any>(null); // Currently selected robot data
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

// New post content
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
const api = axios.create({
    baseURL: 'http://127.0.0.1:4523/m1/5188287-4853858-default',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${global.token}`,
    },
});

// Request interceptor to add Token to request headers
api.interceptors.request.use((config) => {
    config.headers['Authorization'] = `Bearer ${global.token}`;
    return config;
});

// Fetch user info, posts, and robot list
async function fetchUserInfo() {
    try {
        const userId = (route.params.userId as string) || global.uuid;
        const response = await api.get(`/user/${userId}`);
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
        }
    } catch (error) {
        ElMessage.error('Failed to fetch user info');
    }
}

// Fetch current user's info
async function fetchCurrentUserInfo() {
    try {
        const response = await api.get(`/user/${global.uuid}`);
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
        formData.append('name', userInfo.value.username);
        formData.append('intro', userInfo.value.intro);
        formData.append('email', userInfo.value.email);
        formData.append('icon', userInfo.value.avatar); // Using base64 data
        formData.append('uuid', global.uuid);

        const response = await api.post('/settings', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
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
async function openMessages() {
    try {
        const response = await api.get(`/conversation/${global.uuid}`);
        if (response.status === 200) {
            const data = response.data;
            messages.value = data.conversation_list || [];
            showMessagesModal.value = true;
        }
    } catch (error) {
        ElMessage.error('Failed to fetch messages list');
    }
}

// View chat history
async function viewChatHistory(message: any) {
    try {
        const response = await api.get(
            `/get_history/${global.uuid}/${message.userid}`
        );
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
        const payload = {
            conversation: JSON.stringify({
                content: chatReplyContent.value,
                icon: currentUserInfo.value.avatar,
                postid: '',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                type: 'query',
                userid: global.uuid,
                responses: {},
            }),
            icon: currentUserInfo.value.avatar,
            uuid: chatWithUser.value,
        };
        const response = await api.post('/send_message', payload);
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
        const payload = {
            content: newPostContent.value,
            icon: currentUserInfo.value.avatar,
            name: currentUserInfo.value.username,
            uuid: userInfo.value.uuid, // Recipient's UUID
        };
        const response = await api.post('/post', payload);
        if (response.status === 200) {
            ElMessage.success('Post published successfully');
            newPostContent.value = '';
            showPostDialog.value = false;
            // Update post list
            await fetchUserInfo();
        } else {
            ElMessage.error('Failed to publish post');
        }
    } catch (error) {
        ElMessage.error('Failed to publish post');
    }
}

// Send private message
async function sendPrivateMessage() {
    if (newComment.value.trim() === '') {
        ElMessage.warning('Content cannot be empty');
        return;
    }
    try {
        const payload = {
            conversation: JSON.stringify({
                content: newComment.value,
                icon: currentUserInfo.value.avatar,
                postid: '',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                type: 'query',
                userid: global.uuid,
                responses: {},
            }),
            icon: currentUserInfo.value.avatar,
            uuid: userInfo.value.uuid,
        };
        const response = await api.post('/send_message', payload);
        if (response.status === 200) {
            ElMessage.success('Message sent successfully');
            newComment.value = '';
            showMessageDialog.value = false;
        } else {
            ElMessage.error('Failed to send message');
        }
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
            }
        );
        if (response.status === 200) {
            ElMessage.success('Rating sent successfully');
            showRateDialog.value = false;
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
            payload
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

// Show robot details modal
function openRobotModal(robot: any) {
    selectedRobot.value = robot;
    showRobotModal.value = true;
    robotComment.value = '';
    robotRating.value = 0;
}

// Handle logout
function logOut() {
    router.push('/');
    global.notLogin = true;
    global.uuid = '';
    global.token = '';
}

function inputFile(event) {
    userInfo.value.filename = event.target.files[0].name;
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    fileReader.onload = function (e) {
        userInfo.value.avatar = e.target.result;
    };
}

// Format timestamp
function getTimeString(timestamp: string) {
    return dayjs(timestamp).format('MM-DD HH:mm:ss');
}

// Page initialization
onMounted(() => {
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
                <ElIcon @click="openMessages" class="cursor-pointer mr-4">
                    <ChatDotRound/>
                </ElIcon>
                <RouterLink to="/">
                    <ElIcon>
                        <Close/>
                    </ElIcon>
                </RouterLink>
            </div>
        </div>

        <!-- User Info Section -->
        <div class="mb-8">
            <div v-if="!editMode">
                <ElAvatar :src="userInfo.avatar" size="large" class="mb-4"/>
                <p><strong>Username:</strong> {{ userInfo.username }}</p>
                <p><strong>Intro:</strong> {{ userInfo.intro }}</p>
                <p v-if="isOwnProfile"><strong>Email:</strong> {{ userInfo.email }}</p>
            </div>
            <div v-else>
                <ElForm>
                    <ElFormItem label="Avatar">
                        <div class="avatar-uploader mb-4">
                            <ElAvatar :src="userInfo.avatar" size="large"/>
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
                        </div>
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
                    <ElButton @click="updateUserInfo" type="success" class="mt-4">
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
                        <ElButton @click="sendPrivateMessage" type="primary">
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

        <!-- Posts Section -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">Posts</h3>
            <div v-for="(post, index) in posts" :key="index" class="mb-4">
                <div class="flex items-center mb-2">
                    <ElAvatar :src="post.icon" size="small"/>
                    <span class="ml-2">{{ post.name }}</span>
                    <span class="ml-auto text-gray-500">{{ getTimeString(post.time) }}</span>
                </div>
                <p>{{ post.content }}</p>
                <div v-if="post.type === 'rate'" class="mt-1">
                    <ElRate :model-value="post.rate" disabled allow-half/>
                </div>
            </div>
        </div>

        <!-- Robots Section -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">Robots</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ElCard
                    v-for="(robot, index) in robots"
                    :key="index"
                    shadow="hover"
                    @click="openRobotModal(robot)"
                >
                    <div class="flex items-center mb-4">
                        <ElAvatar :src="robot.icon" size="large"/>
                        <h4 class="text-lg font-semibold ml-4">{{ robot.robot_name }}</h4>
                    </div>
                    <p>Model: {{ robot.base_model }}</p>
                    <p>Price: {{ robot.price }}</p>
                    <p>Users: {{ robot.population }}</p>
                    <div class="flex items-center">
                        <p>Rating:</p>
                        <ElRate :model-value="robot.rate" disabled allow-half/>
                    </div>
                </ElCard>
            </div>
        </div>

        <!-- Logout Button -->
        <div v-if="isOwnProfile" class="w-full text-center mt-8">
            <ElButton @click="logOut">Logout</ElButton>
        </div>

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
                <div class="text-center mt-4">
                    <ElButton type="primary" @click="showRobotRateModal = true">
                        Rate
                    </ElButton>
                </div>
            </template>
            <template #footer>
                <ElButton @click="showRobotModal = false">Close</ElButton>
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
                                    <span class="ml-2">{{ chat.userid }}</span>
                                    <span class="ml-auto text-gray-500">
                    {{ getTimeString(chat.time) }}
                  </span>
                                </div>
                                <p>{{ chat.content }}</p>
                            </div>
                        </ElScrollbar>
                        <!-- Reply input box -->
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
            </template>
            <template #footer>
                <ElButton @click="showMessagesModal = false">Close</ElButton>
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
</style>
