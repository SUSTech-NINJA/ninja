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
    ElUpload,
    ElAvatar,
    ElMessage,
    ElScrollbar
} from 'element-plus';
import {Close, ChatDotRound} from "@element-plus/icons-vue";
import {useGlobalStore} from "../stores/global";
import {useRouter, useRoute, RouterLink} from "vue-router";
import dayjs from 'dayjs';

const global = useGlobalStore();
const router = useRouter();
const route = useRoute();
const editMode = ref(false);  // 切换用户信息编辑模式
const showRobotModal = ref(false);  // 切换机器人详情模态框
const showMessagesModal = ref(false);  // 切换消息列表模态框
const selectedRobot = ref<any>(null);  // 当前选中的机器人数据
const robots = ref<any[]>([]);  // 机器人列表
const userInfo = ref({
    username: "",
    email: "",
    avatar: "", // 用户头像
    intro: "",  // 用户简介
    uuid: "",
    rate: 0,
    filename: ""
});
const isOwnProfile = computed(() => {
    const userId = route.params.userId as string;
    return !userId || userId === global.uuid;
});

// 新评论和评分的变量
const newComment = ref('');
const newRating = ref(0);

// 新帖子内容
const newPostContent = ref('');

// 已发布的帖子列表
const posts = ref<any[]>([]);

// 消息列表
const messages = ref<any[]>([]);

// 平均评分
const averageRating = ref(0);

// 聊天记录
const chatHistory = ref<any[]>([]);
const showChatHistoryModal = ref(false);
const chatWithUser = ref('');
const chatReplyContent = ref('');

// Axios实例，带有基本配置和请求拦截器
const api = axios.create({
    baseURL: 'http://127.0.0.1:4523/m1/5188287-4853858-default',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${global.token}`
    }
});

// 请求拦截器，添加Token到请求头
api.interceptors.request.use(config => {
    config.headers['Authorization'] = `Bearer ${global.token}`;
    return config;
});

// 获取用户信息、帖子和机器人列表
async function fetchUserInfo() {
    try {
        const userId = route.params.userId as string || global.uuid;
        const response = await api.get(`/user/${userId}`);
        if (response.status === 200) {
            const data = response.data;
            userInfo.value.username = data.UserInfo.name;
            userInfo.value.email = data.UserInfo.email;
            userInfo.value.avatar = data.UserInfo.icon;
            userInfo.value.intro = data.UserInfo.intro;
            userInfo.value.uuid = data.UserInfo.uuid;
            userInfo.value.rate = data.UserInfo.rate;
            robots.value = data.robot ? data.robot.slice(0, 3) : [];  // 只展示3个机器人
            posts.value = data.post || [];
        }
    } catch (error) {
        ElMessage.error('获取用户信息失败');
    }
}

// 更新用户信息
async function updateUserInfo() {
    try {
        const formData = new FormData();
        formData.append('name', userInfo.value.username);
        formData.append('intro', userInfo.value.intro);
        formData.append('email', userInfo.value.email);
        formData.append('icon', userInfo.value.avatar);  // 使用 base64 数据
        formData.append('uuid', global.uuid);

        const response = await api.post('/settings', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.status === 200) {
            ElMessage.success('用户信息更新成功');
            editMode.value = false;
        } else {
            ElMessage.error('更新用户信息失败');
        }
    } catch (error) {
        ElMessage.error('更新用户信息失败');
    }
}

// 打开消息列表
async function openMessages() {
    try {
        const response = await api.get(`/conversation/${global.uuid}`);
        if (response.status === 200) {
            const data = response.data;
            messages.value = data.conversation_list || [];
            showMessagesModal.value = true;
        }
    } catch (error) {
        ElMessage.error('获取消息列表失败');
    }
}

// 查看聊天历史
async function viewChatHistory(message: any) {
    try {
        const response = await api.get(`/get_history/${global.uuid}/${message.userid}`);
        if (response.status === 200) {
            const data = response.data;
            chatHistory.value = data.history || [];
            showChatHistoryModal.value = true;
            chatWithUser.value = message.userid;
        }
    } catch (error) {
        ElMessage.error('获取聊天记录失败');
    }
}

// 发送聊天回复
async function sendChatReply() {
    if (chatReplyContent.value.trim() === '') {
        ElMessage.warning('回复内容不能为空');
        return;
    }
    try {
        const payload = {
            conversation: JSON.stringify({
                content: chatReplyContent.value,
                icon: userInfo.value.avatar,
                postid: '',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                type: 'query',
                userid: global.uuid,
                responses: {},
            }),
            icon: userInfo.value.avatar,
            uuid: chatWithUser.value
        };
        const response = await api.post('/send_message', payload);
        if (response.status === 200) {
            ElMessage.success('消息发送成功');
            chatReplyContent.value = '';
            // 刷新聊天记录
            await viewChatHistory({userid: chatWithUser.value});
        } else {
            ElMessage.error('消息发送失败');
        }
    } catch (error) {
        ElMessage.error('消息发送失败');
    }
}

// 发送帖子
async function publishPost() {
    if (newPostContent.value.trim() === '') {
        ElMessage.warning('帖子内容不能为空');
        return;
    }
    try {
        const payload = {
            content: newPostContent.value,
            icon: userInfo.value.avatar,
            name: userInfo.value.username,
            uuid: global.uuid
        };
        const response = await api.post('/post', payload);
        if (response.status === 200) {
            ElMessage.success('帖子发布成功');
            newPostContent.value = '';
            // 更新帖子列表
            await fetchUserInfo();
        } else {
            ElMessage.error('帖子发布失败');
        }
    } catch (error) {
        ElMessage.error('帖子发布失败');
    }
}

// 发送私信或评分
async function sendAction(actionType: string) {
    if (actionType === 'query' && newPostContent.value.trim() === '') {
        ElMessage.warning('内容不能为空');
        return;
    }
    if (actionType === 'rate' && newRating.value === 0) {
        ElMessage.warning('请给出评分');
        return;
    }
    try {
        const payload = {
            conversation: JSON.stringify({
                content: newPostContent.value,
                icon: userInfo.value.avatar,
                postid: '',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                type: actionType,
                userid: global.uuid,
                rate: actionType === 'rate' ? newRating.value : undefined,
                responses: {},
            }),
            icon: userInfo.value.avatar,
            uuid: userInfo.value.uuid
        };
        const response = await api.post('/send_message', payload);
        if (response.status === 200) {
            ElMessage.success(`${actionType === 'query' ? '私信' : '评分'}发送成功`);
            newPostContent.value = '';
            newRating.value = 0;
        } else {
            ElMessage.error(`${actionType === 'query' ? '私信' : '评分'}发送失败`);
        }
    } catch (error) {
        ElMessage.error(`${actionType === 'query' ? '私信' : '评分'}发送失败`);
    }
}

// 切换用户信息编辑模式
function toggleEditMode() {
    editMode.value = !editMode.value;
}

// 显示机器人详情模态框
function openRobotModal(robot: any) {
    selectedRobot.value = robot;
    showRobotModal.value = true;
    newComment.value = '';
    newRating.value = 0;
}

// 处理注销
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

// 格式化时间戳
function getTimeString(timestamp: string) {
    return dayjs(timestamp).format('MM-DD HH:mm:ss');
}

// 页面初始化
onMounted(() => {
    fetchUserInfo();
});
</script>

<template>
    <div class="p-6 w-full h-full overflow-auto">
        <!-- 头部区域 -->
        <div class="grid grid-cols-3 w-full mb-4 items-center">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">
                    {{ isOwnProfile ? '我的主页' : userInfo.username + '的主页' }}
                </h1>
            </div>
            <div class="text-right flex items-center justify-end">
                <ElIcon v-if="isOwnProfile" @click="openMessages" class="cursor-pointer mr-4">
                    <ChatDotRound/>
                </ElIcon>
                <RouterLink to="/">
                    <ElIcon>
                        <Close/>
                    </ElIcon>
                </RouterLink>
            </div>
        </div>

        <!-- 用户信息区域 -->
        <div class="mb-8">
            <h2 class="text-xl font-semibold mb-4">用户信息</h2>
            <div v-if="!editMode">
                <ElAvatar :src="userInfo.avatar" size="large" class="mb-4"/>
                <p><strong>用户名：</strong> {{ userInfo.username }}</p>
                <p><strong>简介：</strong> {{ userInfo.intro }}</p>
                <p v-if="isOwnProfile"><strong>邮箱：</strong> {{ userInfo.email }}</p>
                <div v-if="userInfo.rate > 0" class="mt-2">
                    <p><strong>平均评分：</strong>
                        <ElRate :model-value="userInfo.rate"></ElRate>
                    </p>
                </div>
                <ElButton v-if="isOwnProfile" @click="toggleEditMode" type="primary" class="mt-4">编辑信息</ElButton>
            </div>
            <div v-else>
                <ElForm>
                    <ElFormItem label="Avatar">
                        <div class="avatar-uploader mb-4">
                            <ElAvatar :src="userInfo.avatar" size="large"/>
                            <!-- 使用 input[type="file"] 来上传文件 -->
                            <el-button class="ml-2">
                                Select a file
                                <input type="file" v-on:change="inputFile"
                                       class="opacity-0 absolute top-0 right-0 left-0 bottom-0 !cursor-pointer"/>
                            </el-button>
                            <span class="ml-2.5 text-gray-500">{{ userInfo.filename }}</span>
                        </div>
                    </ElFormItem>
                    <ElFormItem label="Username">
                        <ElInput v-model="userInfo.username" placeholder="请输入用户名" class="mb-4"/>
                    </ElFormItem>
                    <ElFormItem label="intro">
                        <ElInput v-model="userInfo.intro" placeholder="请输入简介" class="mb-4"/>
                    </ElFormItem>
                    <ElFormItem label="email">
                        <ElInput v-model="userInfo.email" placeholder="请输入邮箱" class="mb-4"/>
                    </ElFormItem>
                    <ElButton @click="updateUserInfo" type="success" class="mt-4">保存</ElButton>
                </ElForm>
            </div>
        </div>

        <!-- 发布帖子区域（仅在自己的主页显示） -->
        <div v-if="isOwnProfile" class="mb-8">
            <h2 class="text-xl font-semibold mb-4">发布帖子</h2>
            <ElInput
                type="textarea"
                v-model="newPostContent"
                placeholder="输入帖子内容"
                class="mb-4"
            />
            <ElButton @click="publishPost" type="primary">发布</ElButton>
        </div>

        <!-- 操作按钮（在查看他人主页时显示） -->
        <div v-else class="mb-8">
            <h2 class="text-xl font-semibold mb-4">操作</h2>
            <ElInput
                type="textarea"
                v-model="newPostContent"
                placeholder="输入内容"
                class="mb-4"
            />
            <div class="flex space-x-4">
                <ElButton @click="sendAction('post')" type="primary">发布</ElButton>
                <ElButton @click="sendAction('query')" type="success">私信</ElButton>
                <div class="flex items-center">
                    <ElRate v-model="newRating" class="mr-2"/>
                    <ElButton @click="sendAction('rate')" type="warning">评分</ElButton>
                </div>
            </div>
        </div>

        <!-- 帖子区域 -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">帖子</h3>
            <div v-for="(post, index) in posts" :key="index" class="mb-4">
                <div class="flex items-center mb-2">
                    <ElAvatar :src="post.icon" size="small"/>
                    <span class="ml-2">{{ post.userid }}</span>
                    <span class="ml-auto text-gray-500">{{ getTimeString(post.time) }}</span>
                </div>
                <p>{{ post.content }}</p>
                <div v-if="post.type === 'rate'" class="mt-1">
                    <ElRate :model-value="post.rate" disabled></ElRate>
                </div>
            </div>
        </div>

        <!-- 机器人区域 -->
        <div class="mt-8">
            <h3 class="text-lg font-semibold">机器人</h3>
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
                    <p>模型：{{ robot.base_model }}</p>
                    <p>价格：{{ robot.price }}</p>
                </ElCard>
            </div>
        </div>

        <!-- 注销按钮 -->
        <div class="w-full text-center mt-8">
            <ElButton @click="logOut">注销</ElButton>
        </div>

        <!-- 机器人详情模态框 -->
        <ElDialog v-model="showRobotModal" :title="selectedRobot && selectedRobot.robot_name" width="30%"
                  :before-close="() => showRobotModal = false">
            <template #default>
                <ElAvatar :src="selectedRobot && selectedRobot.icon" size="large" class="mb-4"/>
                <p><strong>模型：</strong> {{ selectedRobot && selectedRobot.base_model }}</p>
                <p><strong>价格：</strong> {{ selectedRobot && selectedRobot.price }}</p>
                <p><strong>系统提示词：</strong> {{
                        selectedRobot && selectedRobot.system_prompt.substring(0, 50) + '...'
                    }}</p>
                <!-- 限制系统提示词展示长度 -->
            </template>
            <template #footer>
                <ElButton @click="showRobotModal = false">关闭</ElButton>
            </template>
        </ElDialog>

        <!-- 消息列表模态框 -->
        <ElDialog v-model="showMessagesModal" title="私信" width="50%" :before-close="() => showMessagesModal = false">
            <template #default>
                <div class="flex">
                    <!-- 左侧用户列表 -->
                    <div class="w-1/3 pr-4 border-r">
                        <ElScrollbar height="400px">
                            <div v-for="(message, index) in messages" :key="index" class="mb-4 cursor-pointer"
                                 @click="viewChatHistory(message)">
                                <div class="flex items-center">
                                    <ElAvatar :src="message.icon" size="small"/>
                                    <span class="ml-2">{{ message.userid }}</span>
                                </div>
                            </div>
                        </ElScrollbar>
                    </div>
                    <!-- 右侧聊天记录 -->
                    <div class="w-2/3 pl-4">
                        <ElScrollbar height="400px">
                            <div v-for="(chat, index) in chatHistory" :key="index" class="mb-4">
                                <div class="flex items-center mb-2">
                                    <ElAvatar :src="chat.icon" size="small"/>
                                    <span class="ml-2">{{ chat.userid }}</span>
                                    <span class="ml-auto text-gray-500">{{ getTimeString(chat.time) }}</span>
                                </div>
                                <p>{{ chat.content }}</p>
                            </div>
                        </ElScrollbar>
                        <!-- 回复输入框 -->
                        <ElInput
                            type="textarea"
                            v-model="chatReplyContent"
                            placeholder="输入回复内容"
                            class="mt-4"
                        />
                        <ElButton type="primary" @click="sendChatReply" class="mt-2">发送</ElButton>
                    </div>
                </div>
            </template>
            <template #footer>
                <ElButton @click="showMessagesModal = false">关闭</ElButton>
            </template>
        </ElDialog>
    </div>
</template>

<style scoped>
.el-card {
    padding: 1rem;
    border-radius: 10px;
    cursor: pointer;
}

.el-dialog img {
    object-fit: cover;
}

.avatar-uploader {
    display: flex;
    align-items: center;
}

.avatar-uploader .el-avatar {
    cursor: pointer;
}

.avatar-uploader .el-upload {
    margin-left: 10px;
}

.el-dialog__body {
    max-height: 60vh;
    overflow-y: auto;
}

.p-6 {
    max-width: 800px;
    margin: 0 auto;
}

@media (max-width: 768px) {
    .grid-cols-3 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .col-span-2 {
        grid-column: span 2 / span 2;
    }
}

.el-scrollbar {
    height: auto !important;
}
</style>
