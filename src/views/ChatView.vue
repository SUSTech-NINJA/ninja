<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {computed, onMounted, ref} from "vue";
import {createConnection, toasterOptions, todo} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {ArrowDown, Check, Cpu, Delete, EditPen, More, User} from "@element-plus/icons-vue";
import RatePanel from "../components/RatePanel.vue";
import {useGlobalStore} from "../stores/global";

const chat = useChatStore();
const global = useGlobalStore();
const curChat = computed(() => chat.chatList.find((item) => item.chatid === chat.current));
const conn = createConnection();
const toaster = createToaster(toasterOptions);
const fetchFlag = ref(false), messages = ref([]), chatInput = ref(''),
    robotid = ref(''), baseModel = ref(''), robotInfo = ref({}),
    editingCur = ref(false), titleEditing = ref(""), isSingleRound = ref(false),
    isOptimizingPrompt = ref(false);

onMounted(() => fetcher());
let lastFetchFlag = false;
chat.$subscribe(() => {
    if (fetchFlag.value !== lastFetchFlag) {
        lastFetchFlag = fetchFlag.value;
    } else fetcher();
});

const fetcher = () => {
    getMessages();
};

const getMessages = () => {
    conn.get('/chat/' + chat.current)
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            messages.value = data.messages;
            robotid.value = data.robotid;
            baseModel.value = data['base-model'];
            conn.get('/robot/' + robotid.value)
                .then(res => {
                    let data = res.data;
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    robotInfo.value = data;
                })
                .catch(err => {
                    toaster.show('Query robot info failed', {type: 'error'});
                    robotInfo.value = {};
                });
        })
        .catch(err => {
            toaster.show('Query chat list failed', {type: 'error'});
            messages.value = [];
        });
};

function openRateDialog() {
    global.dialogs.rate = true;
}

function editCur() {
    if (editingCur.value) {
        let formData = new FormData();
        formData.append('title', titleEditing.value);
        conn.post('/chat/edit/' + curChat.value.chatid, formData)
            .then(res => {
                toaster.show('Chat title updated', {type: 'success'});
                for (let i = 0; i < chat.chatList.length; i++) {
                    if (chat.chatList[i].chatid === curChat.value.chatid) {
                        chat.chatList[i].title = titleEditing.value;
                        break;
                    }
                }
            })
            .catch(err => {
                toaster.show('Chat title update failed', {type: 'error'});
            });
    } else {
        titleEditing.value = curChat.value.title;
    }
    editingCur.value = !editingCur.value;
}

function sendChat() {
    if (chatInput.value === '') {
        toaster.show('Message cannot be empty', {type: 'warning'});
        return;
    }
    let formData = new FormData();
    formData.append('message', chatInput.value);
    formData.append('single-round', isSingleRound.value.toString());
    conn.post('/chat/' + chat.current, formData)
        .then(res => {
            toaster.show('Message sent', {type: 'success'});
            chatInput.value = '';
            getMessages();
        })
        .catch(err => {
            toaster.show('Message send failed', {type: 'error'});
        });
}

function clearContext() {
    conn.post('/chat/clear/' + curChat.value.chatid)
        .then(res => {
            toaster.show('Context cleared', {type: 'success'});
            chat.current = '';
        })
        .catch(err => {
            toaster.show('Context clear failed', {type: 'error'});
        });
}

function optimizePrompt() {
    isOptimizingPrompt.value = true;
    conn.get('/chat/optimize', {
        params: {
            'text': chatInput.value
        }
    })
        .then(res => {
            toaster.show('Prompt optimized', {type: 'success'});
            chatInput.value = res.data;
            isOptimizingPrompt.value = false;
        })
        .catch(err => {
            toaster.show('Prompt optimization failed', {type: 'error'});
            isOptimizingPrompt.value = false;
        });
}

function getRobotName() {
    try {
        return robotInfo.value['info']['robot_name'];
    } catch (e) {
        return '';
    }
}
</script>

<template>
    <div class="p-6 w-full h-full flex items-center"
        v-if="chat.current === '' || chat.chatList.length === 0 || curChat === null || typeof curChat == 'undefined'">
        <div class="h-fit w-full text-gray-500">
            Select a chat from left to start messaging.
        </div>
    </div>
    <div v-else class="p-6 w-full h-full flex flex-col">
        <div class="grid grid-cols-3 w-full mb-4 flex-none">
            <div class="col-span-2 text-left block">
                <h1 class="text-xl font-bold inline-block" v-if="!editingCur">
                    {{ curChat?.title }}
                </h1>
                <el-input v-model="titleEditing" v-else class="w-1/2" />
                <p class="text-sm text-gray-500 inline-block ml-1.5">
                    {{ getRobotName() }}
                </p>
            </div>
            <div class="text-right">
                <el-button :icon="editingCur ? Check : EditPen" @click="editCur" circle class="mr-3"
                    title="Edit Conversation" />
                <el-button :icon="Delete" @click="clearContext" circle class="mr-3" title="Clear Context" />
                <el-dropdown>
                    <el-button :icon="More" title="More" circle />
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="openRateDialog">Rate the robot</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>
        <div class="grow overflow-scroll">
            <div v-for="item in messages" v-show="item.role !== 'system'" :key="item.id" class="flex flex-col mb-4">
                <div class="flex items-center" :class="item.role === 'user' ? 'flex-row-reverse' : ''">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="item.role === 'user' ? 'bg-blue-100' : 'bg-zinc-100'">
                        <el-icon>
                            <template v-if="item.role === 'user'">
                                <User />
                            </template>
                            <template v-else>
                                <Cpu />
                            </template>
                        </el-icon>
                    </div>
                    <el-card shadow="never" class="ml-3 mr-3 text-sm"
                        :class="item.role === 'user' ? 'bg-blue-50' : 'bg-neutral-50'">
                        {{ item.content }}
                    </el-card>
                </div>
            </div>
        </div>
        <div class="flex-none flex flex-col">
            <div class="w-full">
                <el-input type="textarea" v-loading="isOptimizingPrompt" v-model="chatInput"
                    :autosize="{ minRows: 2, maxRows: 6 }"
                    placeholder="Type a message" class="w-full" />
            </div>
            <div class="w-full mt-2.5 grid grid-cols-2">
                <div class="text-left">
                    <el-button @click="isSingleRound = !isSingleRound" type="text">
                        {{ isSingleRound ? 'Single Round: Enabled' : 'Single Round: Disabled' }}
                    </el-button>
                    <el-dropdown class="ml-2.5">
                        <el-button type="text">
                            Multimodal
                            <el-icon class="el-icon--right">
                                <ArrowDown />
                            </el-icon>
                        </el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item @click="todo">Add a file</el-dropdown-item>
                                <el-dropdown-item @click="todo">Add an image</el-dropdown-item>
                                <el-dropdown-item @click="todo">Record voice</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
                <div class="text-right">
                    <el-button @click="optimizePrompt" class="mr-2.5">Optimize Prompt</el-button>
                    <el-button type="primary" @click="sendChat">Send</el-button>
                </div>
            </div>
        </div>
    </div>
    <RatePanel :robotid="robotid" :userid="global.uuid" />
</template>

<style scoped>
.el-button + .el-button {
    margin-left: 0 !important;
}
</style>