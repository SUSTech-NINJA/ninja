import {createMemoryHistory, createRouter} from 'vue-router';

const routes = [
    {path: '/', component: import('./views/ChatView.vue')},
    {path: '/settings', component: import('./views/SettingsView.vue')},
    {path: '/user', component: () => import('./views/UserView.vue')},
];

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
});