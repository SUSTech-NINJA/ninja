<template>
    <div class="settings-view p-6 w-full h-full">
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
                    prop="tokensLimit"
                    label="Tokens Limit"
                    width="150"
                />
                <el-table-column
                    prop="tokensPrice"
                    label="Tokens Price"
                    width="150"
                />
                <el-table-column
                    label="Actions"
                    align="right"
                    v-slot="scope"
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
                        @click="deleteModel(scope.$index)"
                    >
                        Delete
                    </el-button>
                </el-table-column>
            </el-table>
        </div>

        <div class="bottom-buttons">
            <el-button type="primary" @click="exportModelEvaluation">
                Export Model Comments
            </el-button>
            <el-button type="primary" @click="exportUserInfo">
                Export User Information
            </el-button>
        </div>

        <!-- Setting dialog -->
        <el-dialog
            title="Model Setting"
            v-model="settingDialogVisible"
        >
            <el-form>
                <el-form-item label="Name">
                    <el-input v-model="settingModel.name" />
                </el-form-item>
                <el-form-item label="ID">
                    <el-input v-model="settingModel.id" :disabled="!InputEnable" />
                </el-form-item>
                <el-form-item label="Tokens Limit">
                    <el-input v-model="settingModel.tokensLimit" />
                </el-form-item>
                <el-form-item label="Tokens Price">
                    <el-input v-model="settingModel.tokensPrice" />
                </el-form-item>
            </el-form>

            <span slot="footer" class="dialog-footer">

        <el-button type="primary" @click="onDialogConfirm">Confirm</el-button>
                <el-button @click="settingDialogVisible = false">Cancel</el-button>
      </span>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Close } from "@element-plus/icons-vue";
import { createConnection } from "../config";
import { useGlobalStore } from "../stores/global";

const models = ref([]);
const global = useGlobalStore();

const settingDialogVisible = ref(false);
const InputEnable = ref(true);
const settingModel = ref({
    id: '',
    robotid: '',
    name: '',
    tokensLimit: '',
    tokensPrice: ''
});

const headerCellStyle = {
    backgroundColor: '#f5f7fa',
    color: '#303133',
    fontWeight: 'bold',
};

const conn = createConnection();

const fetchModels = () => {
    conn.get('/admin/robot', {
        headers: { 'Authorization': 'Bearer ' + global.token }
    })
        .then(response => {
            models.value = response.data.map((item: any) => ({
                name: item.name,
                tokensLimit: item.modal_tokens_limitation,
                tokensPrice: item.price,
                robotid: item.robotid,
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
    if (!global.token) return;
    fetchModels();
});

const openSettingDialog = (row: any) => {
    settingModel.value = { ...row };
    settingDialogVisible.value = true;
    InputEnable.value = false;
};

const onDialogConfirm = () => {
    // 在这里添加提交更新数据的逻辑，例如发送 PUT 或 POST 请求到后端
    // 例如：
    // conn.put(`/admin/robot/update/${settingModel.value.id}`, settingModel.value, {
    //   headers: { 'Authorization': 'Bearer ' + global.token }
    // })
    //   .then(() => {
    //     ElMessage({
    //       type: 'success',
    //       message: '更新成功',
    //     });
    //     fetchModels();
    //     settingDialogVisible.value = false;
    //   })
    //   .catch(() => {
    //     ElMessage({
    //       type: 'error',
    //       message: '更新失败',
    //     });
    //   });

    // 目前暂时关闭对话框
    settingDialogVisible.value = false;
    fetchModels();
    InputEnable.value = true;
};

const deleteModel = (index: number) => {
    const model = models.value[index];
    const base_modal_id = model.id;
    conn.delete(`/admin/robot/update/1`, {
        data: { base_modal_id },
        headers: { 'Authorization': 'Bearer ' + global.token }
    })
        .then(() => {
            ElMessage({
                type: 'success',
                message: '删除成功',
            });
            fetchModels();
        })
        .catch(() => {
            ElMessage({
                type: 'error',
                message: '删除失败',
            });
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