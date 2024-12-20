import {defineStore} from 'pinia';

// @ts-ignore
export const useGlobalStore = defineStore('global', {
    state: () => ({
        notLogin: true,
        username: '',
        token: '',
        uuid: '',
        dialogs: {
            rate: false,
            multimodal: false,
        },
        rateMode: '',
        coin: 0,
        notifyChange: 0
    }),
    actions: {},
    persist: {debug: true}
});