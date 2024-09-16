<script setup lang="ts">
import LeftBar from "./components/LeftBar.vue";
import {useChatStore} from "./stores/chat";

const chat = useChatStore();
</script>

<template>
    <div class="w-full h-full el-card flex flex-row is-always-shadow">
        <div class="h-full w-[250px] md:w-[300px] xl:w-[350px] !flex flex-col p-6 border-r-[1.5px] bg-amber-50">
            <LeftBar />
        </div>
        <div class="h-full grow">
            <router-view />
        </div>
    </div>
</template>