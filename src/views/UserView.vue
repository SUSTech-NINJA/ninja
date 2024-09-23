<script setup lang="ts">
import {Close} from "@element-plus/icons-vue";
import {useGlobalStore} from "../stores/global";
import {useRouter} from "vue-router";

const global = useGlobalStore();
const router = useRouter();

function logOut() {
    router.push('/');
    global.notLogin = true;
}
</script>

<template>
    <div class="p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">Me</h1>
            </div>
            <div class="text-right">
                <router-link to="/">
                    <el-icon>
                        <Close />
                    </el-icon>
                </router-link>
            </div>
        </div>
        <div class="w-full">
            TODO
            <hr class="mt-4 mb-4" />
            <div class="w-full text-center">
                <el-button @click="logOut">Logout</el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>