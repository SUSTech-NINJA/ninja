import {createMemoryHistory, createRouter} from 'vue-router';
import ChatView from "./views/ChatView.vue";
import SettingsView from "./views/SettingsView.vue";


const routes = [
    {path: '/', component: ChatView},
    {path: '/settings', component: SettingsView},
];

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
});