<script setup lang="ts">
import LeftBar from "./components/LeftBar.vue";
import LoginPanel from "./components/LoginPanel.vue";
import {useGlobalStore} from "./stores/global";

const global = useGlobalStore();
if (global.uuid === '' || global.token === '') {
    global.notLogin = true;
}
global.notifyChange = 0;
</script>

<template>
    <div class="w-full h-full el-card flex flex-row is-always-shadow !rounded-2xl">
        <div class="h-full w-[250px] md:w-[300px] xl:w-[350px] !flex flex-col p-6 border-r-[1.5px] bg-blue-50">
            <LeftBar/>
        </div>
        <div class="h-full grow">
            <router-view/>
        </div>
    </div>
    <LoginPanel/>
</template>