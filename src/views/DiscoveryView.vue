<template>
    <div class="ranking-view p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">Robot Discovery</h1>
            </div>
            <div class="text-right">
                <router-link to="/">
                    <el-icon>
                        <Close/>
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
                <el-table-column
                    prop="icon"
                    label="Icon"
                >
                    <template #default="{ row }">
                        <img :src="wrapIcon(row.icon, 'bot_avatar.png')" alt="icon" class="robot-icon"/>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="robot_name"
                    label="Robot Name"
                />
                <el-table-column
                    prop="base_model"
                    label="Base Model"
                />
                <el-table-column
                    prop="price"
                    label="Price"
                />
                <el-table-column
                    prop="rate"
                    label="Rate"
                />
                <el-table-column
                    prop="popularity"
                    label="Popularity"
                />
                <el-table-column
                    prop="creator"
                    label="Creator"
                />

            </el-table>
        </div>
    </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {ElMessage} from 'element-plus';
import {Close} from "@element-plus/icons-vue";
import {createConnection} from "../config";
import {useGlobalStore} from "../stores/global";
import {wrapIcon} from "../util.ts";

const global = useGlobalStore();
const conn = createConnection();


const types = [
    {label: 'Best Rated', value: 'best-rated'},
    {label: 'Most Recent', value: 'most-recent'},
    {label: 'Most Viewed', value: 'most-viewed'}
];

const durations = [
    {label: 'Recent', value: 'recent'},
    {label: 'Month', value: 'month'},
    {label: 'All Time', value: 'all'}
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
    let type = selectedType.value,
        duration = selectedDuration.value;

    conn.get(`/robot/trendings/${duration}/${type}`, {
        headers: {
            'Authorization': 'Bearer ' + global.token
        }
    })
        .then(response => {
            robots.value = response.data;
        })
        .catch(_error => {
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