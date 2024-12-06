<script setup lang="ts">
import {FileInfo, useChatStore} from "../stores/chat";
import {computed, nextTick, onMounted, ref} from "vue";
import {createConnection, host, toasterOptions, visualModels} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {ArrowDown, Check, Cpu, Delete, EditPen, More, User} from "@element-plus/icons-vue"; //@ts-ignore
import RatePanel from "../components/RatePanel.vue";
import {useGlobalStore} from "../stores/global";
import {firstUpperCase} from "../util";
import {marked} from "marked";
import sanitizeHtml from 'sanitize-html';

const chat = useChatStore();
const global = useGlobalStore();
const curChat = computed(() => chat.chatList.find((item: any) => item.chatid === chat.current));
const conn = createConnection();
const toaster = createToaster(toasterOptions);
const fetchFlag = ref(false), messages = ref([] as any[]), chatInput = ref(''),
    robotid = ref(''), baseModel = ref(''), robotInfo = ref({} as any), atModel = ref(''), atBaseModel = ref(''),
    editingCur = ref(false), titleEditing = ref(""), isSingleRound = ref(false),
    isOptimizingPrompt = ref(false), multimodalType = ref(''),
    files = ref([] as any[]), fileMimes = ref([] as any[]),
    newFile = ref(null), newFileName = ref(''), newFileMime = ref(''),
    suggestion = ref(""), robotList = ref<any[]>([]);

onMounted(() => {
    if (!global.token) return;
    chat.current = '';
    fetcher();
});
let lastFetchFlag = false;
const chatBox = ref();
chat.$subscribe(() => {
    if (!global.token) return;
    if (fetchFlag.value !== lastFetchFlag) {
        lastFetchFlag = fetchFlag.value;
    } else fetcher();
});

const fetcher = () => {
    getMessages();
    getSuggestions();
    getRobots();
    files.value = [];
    fileMimes.value = [];
    atModel.value = "";
    atBaseModel.value = "";
};

const getRobots = () => {
    conn.get('/robot', {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
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

const getMessages = () => {
    if (chat.current === '') return;
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
            toaster.show('Query chat info failed', {type: 'error'});
            messages.value = [];
        });
};

function openRateDialog(type: string) {
    global.dialogs.rate = true;
    global.rateMode = type;
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
const isStopped = ref(false), deltaSum = ref(0), hasJustSent = ref(false);

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        if (!hasJustSent.value && !(chatInput.value === '' && files.value.length === 0)) {
            hasJustSent.value = true;
            sendChat();
            setTimeout(() => {
                hasJustSent.value = false;
            }, 500);
        }
    }
})

async function sendChat() {
    if (chatInput.value === '' && files.value.length === 0) {
        toaster.show('Message cannot be empty', {type: 'warning'});
        return;
    }
    try {
        controller.value = new AbortController();
        messages.value.push({
            role: 'user',
            content: chatInput.value
        });
        let delta = chatInput.value.length * Number(robotInfo.value?.info?.price);
        if (delta > Number(global.coin) && baseModel.value !== 'gpt-3.5-turbo') {
            toaster.show('Insufficient balance, can only use GPT-3.5', {type: 'warning'});
            messages.value.pop();
            return;
        }
        if (deltaSum.value + delta > Number(robotInfo.value?.info?.quota) && Number(robotInfo.value?.info?.quota) !== 0) {
            toaster.show('Exceeded quota, abort', {type: 'warning'});
            messages.value.pop();
            return;
        }
        isStopped.value = false;
        messages.value.push({
            role: 'assistant',
            content: ''
        });
        await nextTick(() => {
            (chatBox.value as HTMLElement).scrollTop = (chatBox.value as HTMLElement).scrollHeight;
        });
        let last = messages.value.length - 1;
        let sources = [];
        for (let i = 0; i < files.value.length; i++) {
            sources.push(files.value[i].file);
        }
        let json = {
            'message': chatInput.value,
            'single-round': isSingleRound.value.toString(),
            'files': JSON.stringify(sources),
            'mimetypes': JSON.stringify(fileMimes.value),
            'model': (atModel.value !== '') ? atModel.value : robotInfo.value.info.robot_name
        };
        files.value = [];
        fileMimes.value = [];
        chatInput.value = '';
        suggestion.value = '';
        let res = null;
        if (atModel.value !== '') {
            res = await fetch(host + '/chat/' + chat.current + '/use/' + atBaseModel.value, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + global.token
                },
                body: JSON.stringify(json),
                signal: controller.value.signal
            })
        } else {
            res = await fetch(host + '/chat/' + chat.current, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + global.token
                },
                body: JSON.stringify(json),
                signal: controller.value.signal
            })
        }
        toaster.show('Message sent', {type: 'success'});
        const reader = res.body?.getReader();
        if (typeof reader != 'undefined') {
            while (true) {
                if (isStopped.value) break;
                const {done, value} = await reader.read();
                if (done) break;
                messages.value[last].content += new TextDecoder().decode(value);
                await nextTick(() => {
                    (chatBox.value as HTMLElement).scrollTop = (chatBox.value as HTMLElement).scrollHeight;
                });
            }
        }
        try {
            messages.value[last].content = JSON.parse(messages.value[last].content);
        } catch (_e) {
        }
        deltaSum.value += delta;
        global.coin -= delta;
        let coinFormData = new FormData();
        coinFormData.append('result', global.coin.toString());
        conn.post('/shop/buy_package', coinFormData, {
            headers: {'Authorization': 'Bearer ' + global.token}
        })
            .then(_res => {
            })
            .catch(_err => {
                toaster.show('Failed to deduct money', {type: 'error'});
            });
        console.log(messages.value);
        if (messages.value.length <= 3)
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
    conn.post('/chat/clear/' + (curChat.value as any).chatid, {}, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(_res => {
            toaster.show('Context cleared', {type: 'success'});
            fetcher();
        })
        .catch(err => {
            console.log(err);
            toaster.show('Context clear failed', {type: 'error'});
        });
}

function getSuggestions() {
    if (chat.current === '') return;
    console.log("CUR", chat.current)
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
    console.log(event.target.files[0]);
    let fileReader = new FileReader();
    fileReader.readAsDataURL(event.target.files[0]);
    fileReader.onload = function (e) {
        newFile.value = e.target?.result as any;
        newFileMime.value = event.target.files[0].type;
    };
}

function removeFile(name: string) {
    files.value = files.value.filter(file => file.name !== name);
    toaster.show('File removed');
}

function submitFile() {
    if (newFile.value === null) {
        toaster.show('No file updated', {type: 'warning'});
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
    console.log(files.value);
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

const getRobotsSlicer = computed(() => {
    return robotList.value.slice(0, 10);
});
</script>

<template>
    <div class="p-6 w-full h-full flex items-center"
         v-if="chat.current === '' || chat.chatList.length === 0 || curChat === null || typeof curChat == 'undefined'">
        <div class="h-fit w-full text-gray-500">
            Select a chat from left to start messaging.
        </div>
    </div>
    <div v-else class="p-6 w-full h-full flex flex-col">
        <div class="grid grid-cols-2 w-full mb-4 flex-none top-bar">
            <div class="text-left block">
                <h1 class="text-xl font-bold inline-block" v-if="!editingCur" :title="(curChat as any)?.title">
                    {{
                        (curChat as any)?.title.length > 35 ? (curChat as any)?.title.substring(0, 35) + '...' : (curChat as any)?.title
                    }}
                </h1>
                <el-input v-model="titleEditing" v-else class="w-1/2"/>
                <p class="text-sm text-gray-500 inline-block ml-1.5">
                    {{ getRobotName() }}
                </p>
            </div>
            <div class="text-right">
                <el-dropdown class="pr-3">
                    <el-button>
                        @Model{{
                            atModel !== '' ? ': ' + atModel : ''
                        }}
                    </el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <div v-for="item in getRobotsSlicer">
                                <el-dropdown-item v-if="item?.robotid !== robotid"
                                                  @click="atModel = item?.robot_name; atBaseModel = item?.base_model">
                                    <span>{{ item?.robot_name }}</span>
                                </el-dropdown-item>
                            </div>
                            <el-dropdown-item divided @click="atModel = ''; atBaseModel = ''">
                                <span>None</span>
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
                <el-button :icon="editingCur ? Check : EditPen" @click="editCur" circle class="mr-3"
                           title="Edit Conversation"/>
                <el-button :icon="Delete" @click="clearContext" circle class="mr-3" title="Clear Context"/>
                <el-dropdown>
                    <el-button :icon="More" title="More" circle/>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="openRateDialog('robot')">Rate the robot</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>
        <div class="flex-grow overflow-scroll" ref="chatBox">
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
                        <div class="flex items-end">
                            <el-card shadow="never"
                                     class="text-sm w-fit max-w-[500px] lg:max-w-[600px] xl:max-w-[700px]"
                                     :class="item.role === 'user' ? 'bg-blue-50 text-right mr-3' : 'bg-neutral-50 text-left ml-3'">
                            <span v-if="typeof item.content == 'string'" class="hljs-container"
                                  v-html="sanitizeHtml(marked.parse(item.content) as string)"></span>
                                <span v-else>
                                <p v-for="part in item.content">
                                    <span v-if="part.hasOwnProperty('text')" class="hljs-container"
                                          v-html="sanitizeHtml(marked.parse(part.text) as string)">
                                    </span>
                                    <span v-else-if="part.hasOwnProperty('image_url')">
                                        <el-image :src="part['image_url']['url']" class="w-32 h-32"/>
                                    </span>
                                    <span v-else>{{ part }}</span>
                                </p>
                            </span>
                            </el-card>
                            <el-dropdown v-if="item.role === 'assistant'">
                                <el-button size="small" class="ml-1.5" :icon="More" title="More" circle/>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item @click="openRateDialog('response')">Rate this response
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                        <div class="text-xs text-gray-500 text-left ml-3 mt-3"
                             v-if="isLastAssistantMsg(item.role, index)">
                            <el-check-tag type="info" size="small" class="!text-xs !p-1.5 !font-normal"
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
                    <el-dropdown class="ml-2.5" v-if="visualModels.includes(baseModel)">
                        <el-button type="text">
                            Files{{ files.length > 0 ? ': ' + files.length + ' files' : '' }}
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
                                    a text file
                                </el-dropdown-item>
                                <el-dropdown-item @click="openMultimodalDialog('image')">Add an image</el-dropdown-item>
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
            <el-form-item label="File">
                <el-button>
                    Select a file
                    <input type="file" v-on:change="inputFile"
                           :accept="multimodalType === 'image' ? 'image/*' : 'text/*'"
                           class="opacity-0 absolute top-0 right-0 left-0 bottom-0 !cursor-pointer"/>
                </el-button>
                <span class="ml-2.5 text-gray-500">{{ newFileName }}</span>
            </el-form-item>
            <el-form-item label="Preview" v-if="multimodalType === 'image' && newFile != null">
                <el-image :src="newFile"/>
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