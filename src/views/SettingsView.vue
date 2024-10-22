<script setup lang="ts">
import {Close} from "@element-plus/icons-vue";
</script>

<template>
    <div class="p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">Administrator Settings</h1>
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
        </div>
    </div>
</template>

<style scoped>

</style>