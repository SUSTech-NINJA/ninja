import {defineStore} from 'pinia';

export type ChatInfo = {
    chatid: string;
    time: string;
    title: string;
}

export type FileInfo = {
    file: string;
    name: string;
    type: string;
}

// @ts-ignore
export const useChatStore = defineStore('chat', {
    state: () => ({
        current: "",
        msgList: {} as any,
        chatList: [] as any[],
    }),
    persist: {debug: true}
});