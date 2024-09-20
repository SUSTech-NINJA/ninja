import {createApp} from 'vue';
import 'element-plus/dist/index.css';
import {createPinia} from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import {router} from "./router";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
const app = createApp(App);

import './style.css';

app
    .use(pinia)
    .use(router)
    .mount('#app');
