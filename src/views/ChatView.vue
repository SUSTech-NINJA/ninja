<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {computed, onMounted, ref} from "vue";
import {createConnection, toasterOptions, todo} from "../config";
import {createToaster} from "@meforma/vue-toaster";
import {Cpu, User} from "@element-plus/icons-vue";

const chat = useChatStore();
const curChat = computed(() => chat.chatList.find((item) => item.chatid === chat.current));
const conn = createConnection();
const toaster = createToaster(toasterOptions);
const fetchFlag = ref(false), messages = ref([]), chatInput = ref('');

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
        })
        .catch(err => {
            toaster.show('Query chat list failed', {type: 'error'});
            messages.value = [];
        });
};
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
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">
                    {{ curChat?.title }}
                </h1>
            </div>
            <div class="text-right">
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
                    <el-card shadow="none" class="ml-3 mr-3 text-sm"
                        :class="item.role === 'user' ? 'bg-blue-50' : 'bg-neutral-50'">
                        {{ item.content }}
                    </el-card>
                </div>
            </div>
        </div>
        <div class="flex-none" :style="{boxShadow: '0px -3px 30px -3px #ffffff'}">
            <el-input type="textarea" v-model="chatInput" @input="todo" :autosize="{ minRows: 2, maxRows: 6 }"
                placeholder="Type a message" class="w-full" />
        </div>
    </div>
</template>

<style scoped>

</style>