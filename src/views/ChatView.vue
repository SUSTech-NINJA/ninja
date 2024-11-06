<script setup lang="ts">
import {FileInfo, useChatStore} from "../stores/chat";
import {computed, onMounted, ref} from "vue";
import {createConnection, host, toasterOptions} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {ArrowDown, Check, Cpu, Delete, EditPen, More, User} from "@element-plus/icons-vue"; //@ts-ignore
import RatePanel from "../components/RatePanel.vue";
import {useGlobalStore} from "../stores/global";
import {firstUpperCase} from "../util";

const chat = useChatStore();
const global = useGlobalStore();
const curChat = computed(() => chat.chatList.find((item: any) => item.chatid === chat.current));
const conn = createConnection();
const toaster = createToaster(toasterOptions);
const fetchFlag = ref(false), messages = ref([] as any[]), chatInput = ref(''),
    robotid = ref(''), baseModel = ref(''), robotInfo = ref({} as any),
    editingCur = ref(false), titleEditing = ref(""), isSingleRound = ref(false),
    isOptimizingPrompt = ref(false), multimodalType = ref(''),
    files = ref([] as any[]), fileMimes = ref([] as any[]),
    newFile = ref(null), newFileName = ref(''), newFileMime = ref(''),
    suggestion = ref("");

onMounted(() => {
    if (!global.token) return;
    fetcher();
});
let lastFetchFlag = false;
chat.$subscribe(() => {
    if (!global.token) return;
    if (fetchFlag.value !== lastFetchFlag) {
        lastFetchFlag = fetchFlag.value;
    } else fetcher();
});

const fetcher = () => {
    getMessages();
    getSuggestions();
    files.value = [];
    fileMimes.value = [];
};

const getMessages = () => {
    conn.get('/chat/' + chat.current, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(res => {
            let data = res.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            messages.value = data.messages;
            robotid.value = data.robotid;
            baseModel.value = data['base-model'];
            conn.get('/robot/' + robotid.value, {
                headers: {'Authorization': 'Bearer ' + global.token}
            })
                .then(res => {
                    let data = res.data;
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    robotInfo.value = data;
                })
                .catch(err => {
                    console.log(err);
                    toaster.show('Query robot info failed', {type: 'error'});
                    robotInfo.value = {};
                });
        })
        .catch(err => {
            console.log(err);
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
        conn.post('/chat/edit/' + (curChat.value as any).chatid, formData, {
            headers: {'Authorization': 'Bearer ' + global.token}
        })
            .then(_res => {
                toaster.show('Chat title updated', {type: 'success'});
                for (let i = 0; i < chat.chatList.length; i++) {
                    if ((chat.chatList[i] as any).chatid === (curChat.value as any).chatid) {
                        (chat.chatList[i] as any).title = titleEditing.value;
                        break;
                    }
                }
            })
            .catch(err => {
                console.log(err);
                toaster.show('Chat title update failed', {type: 'error'});
            });
    } else {
        titleEditing.value = (curChat.value as any).title;
    }
    editingCur.value = !editingCur.value;
}

const controller = ref(new AbortController());
const isStopped = ref(false);

async function sendChat() {
    if (chatInput.value === '') {
        toaster.show('Message cannot be empty', {type: 'warning'});
        return;
    }
    try {
        controller.value = new AbortController();
        messages.value.push({
            role: 'user',
            content: chatInput.value
        });
        isStopped.value = false;
        messages.value.push({
            role: 'assistant',
            content: ''
        });
        let last = messages.value.length - 1;
        let json = {
            'message': chatInput.value,
            'single-round': isSingleRound.value.toString(),
            'files': JSON.stringify(files.value),
            'mimetypes': JSON.stringify(fileMimes.value)
        };
        chatInput.value = '';
        suggestion.value = '';
        const res = await fetch(host + '/chat/' + chat.current, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + global.token
            },
            body: JSON.stringify(json),
            signal: controller.value.signal
        });
        toaster.show('Message sent', {type: 'success'});
        const reader = res.body?.getReader();
        if (typeof reader != 'undefined') {
            while (true) {
                if (isStopped.value) break;
                const {done, value} = await reader.read();
                if (done) break;
                messages.value[last].content += new TextDecoder().decode(value);
            }
        }
        conn.get('/title/' + chat.current, {
            headers: {'Authorization': 'Bearer ' + global.token}
        })
            .then(res => {
                let data = res.data;
                editingCur.value = true;
                titleEditing.value = data;
                editCur();
            })
            .catch(err => {
                console.log(err);
                toaster.show('Get title failed', {type: 'error'});
                messages.value = [];
            });
    } catch (err) {
        console.log(err);
        toaster.show('Message send failed', {type: 'error'});
    }
}

function clearContext() {
    conn.post('/chat/clear/' + (curChat.value as any).chatid, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(_res => {
            toaster.show('Context cleared', {type: 'success'});
            chat.current = '';
        })
        .catch(err => {
            console.log(err);
            toaster.show('Context clear failed', {type: 'error'});
        });
}

function getSuggestions() {
    conn.get('/chat/suggestions/' + chat.current, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(res => {
            suggestion.value = res.data;
        })
        .catch(err => {
            console.log(err);
            toaster.show('Query suggestion failed', {type: 'error'});
            suggestion.value = '';
        });
}

function optimizePrompt() {
    isOptimizingPrompt.value = true;
    let formData = new FormData();
    formData.append('text', chatInput.value);
    conn.post('/chat/optimize', formData, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(res => {
            toaster.show('Prompt optimized', {type: 'success'});
            chatInput.value = res.data;
            isOptimizingPrompt.value = false;
        })
        .catch(err => {
            console.log(err);
            toaster.show('Prompt optimization failed', {type: 'error'});
            isOptimizingPrompt.value = false;
        });
}

function getRobotName() {
    try {
        return (robotInfo.value['info'] as any)['robot_name'];
    } catch (e) {
        return '';
    }
}

function openMultimodalDialog(type: string) {
    global.dialogs.multimodal = true;
    newFile.value = null;
    newFileName.value = '';
    newFileMime.value = '';
    multimodalType.value = type;
}

function inputFile(event: any) {
    newFileName.value = event.target.files[0].name;
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    if (event.target.files[0].type !== '')
        fileReader.onload = function (e) {
            newFile.value = e.target?.result as any;
            newFileMime.value = event.target.files[0].type;
        };
    else {
        newFile.value = null;
        newFileName.value = '';
        toaster.show('Invalid file type', {type: 'error'});
    }
}

function removeFile(name: string) {
    files.value = files.value.filter(file => file.name !== name);
    toaster.show('File removed');
}

let mediaRecorder: any = null, timingTimeout: any = null,
    startTime = ref(), curTime = ref();

function startRecord() {
    navigator.mediaDevices.getUserMedia({audio: true})
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            let chunks = [] as any[];
            mediaRecorder.ondataavailable = (e: any) => {
                chunks.push(e.data);
            };
            mediaRecorder.onstop = (_e: any) => {
                if (curTime.value - startTime.value < 1000) {
                    toaster.show('Voice recording too short', {type: 'warning'});
                    return;
                }
                let blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'});
                toaster.success('Voice recorded');
                newFile.value = URL.createObjectURL(blob) as any;
                newFileName.value = 'voice' + startTime.value + '.ogg';
                newFileMime.value = 'audio/ogg';
                if (timingTimeout !== null) {
                    clearInterval(timingTimeout);
                    startTime.value = null;
                    curTime.value = null;
                }
            };
            mediaRecorder.start();
            startTime.value = new Date();
            curTime.value = new Date();
            timingTimeout = setInterval(() => {
                curTime.value = new Date();
            }, 1000);
            toaster.show('Recording started');
        })
        .catch(_err => {
            toaster.show('Failed to record voice', {type: 'error'});
        });
}

const getParsedDuration = computed(() => {
    if (startTime.value === null || curTime.value === null
        || typeof startTime.value === 'undefined' || typeof curTime.value === 'undefined') {
        return '0:00';
    }
    let diff = curTime.value - startTime.value;
    let minutes = Math.floor(diff / 60000);
    let seconds = Math.floor((diff % 60000) / 1000);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
});

function stopRecord() {
    try {
        mediaRecorder.stop();
        toaster.show('Recording stopped', {type: 'info'});
    } catch (e) {
        toaster.show('Failed to stop recording', {type: 'error'});
    }
}

function submitFile() {
    if (newFile.value === null) {
        toaster.show('No file updated or recorded', {type: 'warning'});
        return;
    }
    if ((newFile.value as any).length > 1024 * 1024 * 100) {
        toaster.show('File size exceeds 100kb, abort', {type: 'warning'});
        return;
    }
    files.value.push({
        'type': multimodalType.value,
        'file': newFile.value,
        'name': newFileName.value
    } as FileInfo);
    fileMimes.value.push(newFileMime.value);
    global.dialogs.multimodal = false;
}

function isLastAssistantMsg(role: string, index: number) {
    if (role !== 'assistant') return false;
    else {
        for (let i = messages.value.length - 1; i >= index; i--) {
            if ((messages.value[i] as any).role === 'assistant') {
                return i === index;
            }
        }
        return false;
    }
}

function toggleInput(input: string) {
    chatInput.value = input;
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
        <div class="grid grid-cols-3 w-full mb-4 flex-none top-bar">
            <div class="col-span-2 text-left block">
                <h1 class="text-xl font-bold inline-block" v-if="!editingCur">
                    {{ (curChat as any)?.title }}
                </h1>
                <el-input v-model="titleEditing" v-else class="w-1/2"/>
                <p class="text-sm text-gray-500 inline-block ml-1.5">
                    {{ getRobotName() }}
                </p>
            </div>
            <div class="text-right">
                <el-button :icon="editingCur ? Check : EditPen" @click="editCur" circle class="mr-3"
                           title="Edit Conversation"/>
                <el-button :icon="Delete" @click="clearContext" circle class="mr-3" title="Clear Context"/>
                <el-dropdown>
                    <el-button :icon="More" title="More" circle/>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="openRateDialog">Rate the robot</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>
        <div class="grow overflow-scroll">
            <div v-for="(item, index) in messages" v-show="item.role !== 'system'" :key="item.id"
                 class="flex flex-col mb-4">
                <div class="flex" :class="item.role === 'user' ? 'flex-row-reverse' : ''">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center mt-2"
                         :class="item.role === 'user' ? 'bg-blue-100 mr-1.5' : 'bg-zinc-100 ml-1'">
                        <el-icon>
                            <template v-if="item.role === 'user'">
                                <User/>
                            </template>
                            <template v-else>
                                <Cpu/>
                            </template>
                        </el-icon>
                    </div>
                    <div>
                        <el-card shadow="never" class="ml-3 mr-3 text-sm w-fit"
                                 :class="item.role === 'user' ? 'bg-blue-50 text-right' : 'bg-neutral-50 text-left'">
                            {{ item.content }}
                        </el-card>
                        <div class="text-xs text-gray-500 text-left ml-3 mr-3"
                             v-if="isLastAssistantMsg(item.role, index)">
                            <el-check-tag type="info" size="small" class="mt-2 !text-xs !p-1.5 !font-normal"
                                          @click="toggleInput(suggestion)">{{
                                    suggestion
                                }}
                            </el-check-tag>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex-none flex flex-col">
            <div class="w-full">
                <el-input type="textarea" v-loading="isOptimizingPrompt" v-model="chatInput"
                          :autosize="{ minRows: 2, maxRows: 6 }"
                          placeholder="Type a message" class="w-full"/>
            </div>
            <div class="w-full mt-2.5 grid grid-cols-2">
                <div class="text-left">
                    <el-button @click="isSingleRound = !isSingleRound" type="text">
                        {{ isSingleRound ? 'Single Round: Enabled' : 'Single Round: Disabled' }}
                    </el-button>
                    <el-dropdown class="ml-2.5">
                        <el-button type="text">
                            Multimodal{{ files.length > 0 ? ': ' + files.length + ' files' : '' }}
                            <el-icon class="el-icon--right">
                                <ArrowDown/>
                            </el-icon>
                        </el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item v-if="files.length > 0" disabled>
                                    <span class="text-sm">Click to remove:</span>
                                </el-dropdown-item>
                                <el-dropdown-item v-for="(file, index) in files"
                                                  @click="removeFile(file.name)" :key="index">
                                    {{ file.name }}
                                </el-dropdown-item>
                                <el-dropdown-item :divided="files.length > 0"
                                                  @click="openMultimodalDialog('file')">Add
                                    a file
                                </el-dropdown-item>
                                <el-dropdown-item @click="openMultimodalDialog('image')">Add an image</el-dropdown-item>
                                <el-dropdown-item @click="openMultimodalDialog('voice')">Record voice</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
                <div class="text-right">
                    <el-button @click="optimizePrompt">Optimize Prompt</el-button>
                    <el-button type="primary" @click="sendChat">Send</el-button>
                </div>
            </div>
        </div>
    </div>
    <RatePanel :robotid="robotid" :userid="global.uuid"/>
    <el-dialog v-model="global.dialogs.multimodal"
               :title="'Multimodal: ' + firstUpperCase(multimodalType)" width="50%">
        <el-form label-width="auto">
            <el-form-item label="File" v-if="multimodalType !== 'voice'">
                <el-button>
                    Select a file
                    <input type="file" v-on:change="inputFile" :accept="multimodalType === 'image' ? 'image/*' : '*/*'"
                           class="opacity-0 absolute top-0 right-0 left-0 bottom-0 !cursor-pointer"/>
                </el-button>
                <span class="ml-2.5 text-gray-500">{{ newFileName }}</span>
            </el-form-item>
            <el-form-item label="Preview" v-if="multimodalType === 'image' && newFile != null">
                <el-image :src="newFile"/>
            </el-form-item>
            <el-form-item label="Record Now" v-if="multimodalType === 'voice'">
                <el-button @click="startRecord">Start</el-button>
                <el-button @click="stopRecord">Stop</el-button>
                <span class="ml-2.5 text-gray-500">{{ getParsedDuration }}</span>
            </el-form-item>
            <el-form-item label="Recorded Voice" v-if="multimodalType === 'voice' && newFile != null">
                <audio :src="newFile" controls/>
            </el-form-item>
        </el-form>
        <p class="text-sm text-gray-500">To save tokens, only files <100kb are allowed. </p>
        <template #footer>
            <el-button @click="global.dialogs.multimodal = false">Cancel</el-button>
            <el-button type="primary" @click="submitFile">Confirm</el-button>
        </template>
    </el-dialog>
</template>

<style scoped>
.top-bar .el-button + .el-button {
    margin-left: 0 !important;
}
</style>