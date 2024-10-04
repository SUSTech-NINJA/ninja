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
    }),
    actions: {},
    persist: {debug: true}
});