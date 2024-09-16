<script setup lang="ts">
import {useChatStore} from "../stores/chat";
import {computed} from "vue";

const chat = useChatStore();
const curChat = computed(() => chat.chatList.find((item) => item.id === chat.current));
</script>

<template>
    <div class="p-6 w-full h-full flex items-center"
        v-if="chat.current === -1 || chat.chatList.length === 0 || curChat === null">
        <div class="h-fit w-full text-gray-500">
            Select a chat from left to start messaging.
        </div>
    </div>
    <div v-else class="p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">
                    {{ curChat?.name }}
                </h1>
            </div>
            <div class="text-right">
            </div>
        </div>
        <div class="w-full">
            TODO
        </div>
    </div>
</template>

<style scoped>

</style>