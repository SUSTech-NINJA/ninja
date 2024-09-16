import {defineStore} from 'pinia';

export const useGlobalStore = defineStore('global', {
    state: () => ({}),
    actions: {},
    persist: true
});