import {createMemoryHistory, createRouter} from 'vue-router';

const routes = [
    {path: '/', component: import('./views/ChatView.vue')},
    {path: '/settings', component: import('./views/SettingsView.vue')},
    {path: '/user', component: () => import('./views/UserView.vue')},
    {path: '/discovery', component: () => import('./views/DiscoveryView.vue')},
];

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
});