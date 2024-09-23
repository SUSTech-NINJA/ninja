import {defineStore} from 'pinia';

// @ts-ignore
export const useGlobalStore = defineStore('global', {
    state: () => ({
        notLogin: true,
        username: '',
        token: '',
        uuid: 0
    }),
    actions: {},
    persist: {debug: true}
});