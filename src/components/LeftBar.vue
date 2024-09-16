<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {Close, Setting} from "@element-plus/icons-vue";

const chat = useChatStore();
</script>

<template>
    <div class="card-header text-left text-2xl font-bold flex-none grid grid-cols-2">
        <p>Ninja Chat</p>
        <div class="text-right">
            <router-link to="/settings">
                <el-button :icon="Setting" circle />
            </router-link>
        </div>
        <hr class="mt-3 mb-3 col-span-2" />
    </div>
    <div class="grow h-full mt-4 mb-4">
        <div class="w-full h-full flex items-center" v-if="chat.chatList.length === 0">
            <div class="h-fit w-full text-gray-500">
                No chat available.
            </div>
        </div>
        <el-card v-for="item in chat.chatList" shadow="hover" class="mb-3 relative"
            :class="{'!border-[1px] !border-amber-500': chat.current === item.id}"
            @click="chat.current = item.id">
            <div class="flex-none w-full text-left">
                <p class="text-normal mb-1">{{ item.name }}</p>
                <p class="text-xs">{{ item.time }}</p>
            </div>
            <a @click="chat.removeChat(item.id)" class="absolute top-2 right-2">
                <el-icon>
                    <Close />
                </el-icon>
            </a>
        </el-card>
    </div>
    <div class="flex-none w-full grid grid-cols-2 items-center">
        <div class="text-left text-sm fit-content">
            By NINJA Team.
        </div>
        <div class="text-right">
            <el-button @click="chat.addChat('New Chat')">Start Chat</el-button>
        </div>
    </div>
</template>