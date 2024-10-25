<template>
    <div class="settings-view p-6 w-full h-full">
        <div class="grid grid-cols-3 w-full mb-4">
            <div class="col-span-2 text-left">
                <h1 class="text-xl font-bold">Administrator Settings</h1>
            </div>
            <div class="text-right">
                <router-link to="/">
                    <el-icon>
                        <Close/>
                    </el-icon>
                </router-link>
            </div>
        </div>

        <div class="table-container mb-4">
            <h2 class="text-xl font-bold mb-2">Current Base-Model</h2>
            <el-table
                :data="models"
                style="width: 100%"
                border
                max-height="500"
                :header-cell-style="headerCellStyle"
            >
                <el-table-column
                    prop="name"
                    label="Model Name"
                    width="300"
                />
                <el-table-column
                    prop="tokens"
                    label="Tokens Limit"
                    width="150"
                />
                <el-table-column
                    label="Actions"
                    align="right"
                >
                    <el-button
                        type="primary"
                        size="small"
                        @click="openSettingDialog(scope.row)"
                    >
                        Setting
                    </el-button>

                    <el-button
                        type="danger"
                        size="small"
                        slot="reference"
                        @click="deleteModel(scope.$index)"
                    >
                        Delete
                    </el-button>
                </el-table-column>
            </el-table>
        </div>

        <div class="bottom-buttons">
            <el-button type="primary" @click="exportModelEvaluation">
                导出Model评价
            </el-button>
            <el-button type="primary" @click="exportUserInfo">
                导出用户信息
            </el-button>
        </div>

        <!-- Setting 对话框 -->
        <el-dialog
            title="Model Setting"
            :visible.sync="settingDialogVisible"
        >
            <p>设置内容暂未实现。</p>
            <span slot="footer" class="dialog-footer">
        <el-button @click="settingDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="settingDialogVisible = false">Confirm</el-button>
      </span>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {ElMessage} from 'element-plus';
import {Close} from "@element-plus/icons-vue";
import {createConnection} from "../config.ts";
import {useGlobalStore} from "../stores/global.ts";

const models = ref([]);
const global = useGlobalStore();

const settingDialogVisible = ref(false);

const headerCellStyle = {
    backgroundColor: '#f5f7fa',
    color: '#303133',
    fontWeight: 'bold',
};

const conn = createConnection();

const fetchModels = () => {
    conn.get('/robot', {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(response => {
            models.value = response.data.map((item: any) => ({
                name: item.name,
                tokens: item.robotid,
                id: item.id,
            }));
        })
        .catch(_error => {
            ElMessage({
                type: 'error',
                message: '获取模型数据失败',
            });
        });
};

onMounted(() => {
    fetchModels();
});

const openSettingDialog = (_row: any) => {
    settingDialogVisible.value = true;
};

const deleteModel = (index: any) => {
    models.value.splice(index, 1);
    ElMessage({
        type: 'success',
        message: '删除成功',
    });
};

const exportModelEvaluation = () => {
    ElMessage({
        type: 'info',
        message: '导出Model评价功能暂未实现',
    });
};

const exportUserInfo = () => {
    ElMessage({
        type: 'info',
        message: '导出用户信息功能暂未实现',
    });
};
</script>

<style scoped>
.settings-view {
    padding: 20px;
}

.table-container {
    margin-bottom: 20px;
}

.bottom-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.el-table {
    overflow-y: auto;
}

.el-table th.is-leaf {
    background-color: #f5f7fa !important;
    font-weight: bold;
}
</style>