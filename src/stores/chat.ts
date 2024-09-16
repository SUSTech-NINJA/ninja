import {defineStore} from 'pinia';

export type ChatInfo = {
    id: number;
    time: string;
    name: string;
    msg: string[];
}

export const useChatStore = defineStore('chat', {
    state: () => ({
        current: -1,
        msgIdMax: 0,
        msgList: {},
        chatList: [],
    }),
    actions: {
        addMessage(message: string) {
            if (this.current === -1) return;
            this.msgList[this.current].push(message);
        },
        addChat(name: string) {
            let time = new Date();
            let timeStr = (time.getMonth() + 1) + '/' + time.getDate() + ' ' + time.toLocaleTimeString();
            this.msgIdMax++;
            this.msgList[this.msgIdMax] = [];
            this.chatList.push({
                id: this.msgIdMax,
                name: name,
                msg: [],
                time: timeStr
            } as ChatInfo);
            this.current = this.msgIdMax;
        },
        removeChat(id: number) {
            if (this.current === id) {
                this.current = -1;
            }
            delete this.msgList[id];
            this.chatList = this.chatList.filter(chat => chat.id !== id);
        }
    },
    persist: true
});