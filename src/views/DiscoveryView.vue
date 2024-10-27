<template>
    <div class="ranking-view p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">Robot Discovery</h1>
            </div>
            <div class="text-right">
                <router-link to="/">
                    <el-icon>
                        <Close />
                    </el-icon>
                </router-link>
            </div>
        </div>

        <div class="filter-section mb-4">
            <el-row :gutter="20">
                <el-col :span="10">
                    <el-select v-model="selectedType" placeholder="Ranking Type" @change="fetchTrendingRobots">
                        <el-option
                            v-for="type in types"
                            :key="type.value"
                            :label="type.label"
                            :value="type.value"
                        />
                    </el-select>
                </el-col>
                <el-col :span="10">
                    <el-select v-model="selectedDuration" placeholder="Duration" @change="fetchTrendingRobots">
                        <el-option
                            v-for="duration in durations"
                            :key="duration.value"
                            :label="duration.label"
                            :value="duration.value"
                        />
                    </el-select>
                </el-col>
            </el-row>
        </div>

        <div class="table-container mb-4">
            <h2 class="text-xl font-bold mb-2">Trending Robots</h2>
            <el-table
                :data="robots"
                style="width: 100%"
                border
                max-height="800"
                align="center"
                :header-cell-style="headerCellStyle"
            >
<!--                <el-table-column-->
<!--                    prop="robotid"-->
<!--                    label="Robot ID"-->
<!--                    width="100"-->
<!--                />-->
                <el-table-column
                    prop="icon"
                    label="Icon"
                    width="200"
                >
                    <template #default="{ row }">
                        <img :src="row.icon" alt="icon" class="robot-icon"/>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="robot_name"
                    label="Robot Name"
                    width="150"
                />
                <el-table-column
                    prop="base_model"
                    label="Base Model"
                    width="150"
                />
                <el-table-column
                    prop="price"
                    label="Price"
                    width="100"
                />
<!--                <el-table-column-->
<!--                    prop="quota"-->
<!--                    label="Quota"-->
<!--                    width="100"-->
<!--                />-->
                <el-table-column
                    prop="rate"
                    label="Rate"
                    width="100"
                />
                <el-table-column
                    prop="popularity"
                    label="Popularity"
                    width="100"
                />
<!--                <el-table-column-->
<!--                    prop="system_prompt"-->
<!--                    label="System Prompt"-->
<!--                    width="200"-->
<!--                />-->
<!--                <el-table-column-->
<!--                    prop="knowledge_base"-->
<!--                    label="Knowledge Base"-->
<!--                    width="200"-->
<!--                />-->
                <el-table-column
                    prop="creator"
                    label="Creator"
                    width="150"
                />

            </el-table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close } from "@element-plus/icons-vue";
import axios from 'axios';
import { createConnection } from "../config";
import { useGlobalStore } from "../stores/global";

const global = useGlobalStore();
const conn = createConnection();


const types = [
    { label: 'Best Rated', value: 'best-rated' },
    { label: 'Most Recent', value: 'most-recent' },
    { label: 'Most Viewed', value: 'most-viewed' }
];

const durations = [
    { label: 'Recent', value: 'recent' },
    { label: 'Month', value: 'month' },
    { label: 'All Time', value: 'all' }
];

const selectedType = ref('best-rated');
const selectedDuration = ref('recent');

const robots = ref([]);


const headerCellStyle = {
    backgroundColor: '#f5f7fa',
    color: '#303133',
    fontWeight: 'bold',
};

const fetchTrendingRobots = () => {
    const formData = new FormData();
    formData.append('type', selectedType.value);
    formData.append('duration', selectedDuration.value);

    conn.get('/robot/trendings', formData, {
        headers: {
            'Authorization': 'Bearer ' + global.token,
            'Content-Type': 'multipart/form-data'
        }
    })
        .then(response => {
            robots.value = response.data;
        })
        .catch(error => {
            ElMessage({
                type: 'error',
                message: 'Failed to fetch Discovery data',
            });
        });
};

onMounted(() => {
    if (!global.token) return;
    fetchTrendingRobots();
});
</script>

<style scoped>


.ranking-view {
    padding: 20px;
}

.filter-section {
    margin-bottom: 20px;
}

.table-container {
    margin-bottom: 20px;
}

.robot-icon {
    width: 50px;
    height: 50px;
    object-fit: cover;
}

</style>