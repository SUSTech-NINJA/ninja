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
                    prop="icon"
                    label="Icon"
                    width="100"
                >
                    <template #default="{ row }">
                        <img :src="row.icon" alt="icon" class="robot-icon"/>
                    </template>
                </el-table-column>

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

            <el-tooltip content="Add A New Base-Modal" placement="top">
                <el-button :icon="Plus" circle class="left-icon-button" @click="openAddingDialog" />
            </el-tooltip>

            <div class="right-buttons">
                <el-button type="primary" @click="exportModelEvaluation">
                    Export Model Comments
                </el-button>
                <el-button type="primary" @click="exportUserInfo">
                    Export User Information
                </el-button>
            </div>
        </div>


        <!-- Setting dialog -->
        <el-dialog
            title="Model Setting"
            v-model="settingDialogVisible"
        >
            <el-form>
                <el-form-item label="Icon">
                    <ElAvatar :src="settingModel.icon"/>
                    <ElButton class="ml-2">
                        Select File
                        <input type="file" @change="inputFile" class="opacity-0 absolute top-0 right-0 left-0 bottom-0 cursor-pointer"
                        />
                    </ElButton>
                    <span class="ml-2.5 text-gray-500">{{ settingModel.filename }}</span>

                </el-form-item>
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

        <!-- Add dialog -->
        <el-dialog
            title="Model Addiing"
            v-model="AddDialogVisible"
        >
            <el-form-item label="Icon">
                <ElAvatar :src="settingModel.icon"/>
                <ElButton class="ml-2">
                    Select File
                    <input type="file" @change="inputFile" class="opacity-0 absolute top-0 right-0 left-0 bottom-0 cursor-pointer"
                    />
                </ElButton>
                <span class="ml-2.5 text-gray-500">{{ settingModel.filename }}</span>

            </el-form-item>

            <el-form>
                <el-form-item label="Name">
                    <el-input v-model="settingModel.name" />
                </el-form-item>
                <el-form-item label="ID">
                    <el-select v-model="settingModel.id" placeholder="Select a ID">
                        <el-option
                            v-for="model in baseModels"
                            :key="model"
                            :label="model"
                            :value="model"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="Tokens Limit">
                    <el-input v-model="settingModel.tokensLimit" />
                </el-form-item>
                <el-form-item label="Tokens Price">
                    <el-input v-model="settingModel.tokensPrice" />
                </el-form-item>
            </el-form>

            <span slot="footer" class="dialog-footer">

        <el-button type="primary" @click="onDialogConfirm">Add</el-button>
                <el-button @click="AddDialogVisible = false">Cancel</el-button>
      </span>
        </el-dialog>

    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {Close, Plus, Select} from "@element-plus/icons-vue";
import { createConnection } from "../config";
import { useGlobalStore } from "../stores/global";
import { baseModels} from "../config";

const models = ref([]);
const global = useGlobalStore();

const settingDialogVisible = ref(false);
const AddDialogVisible = ref(false);
const InputEnable = ref(true);
const settingModel = ref({
    id: '',
    robotid: '',
    name: '',
    tokensLimit: '',
    tokensPrice: '',
    icon: '',
    filename: '',
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
                tokensLimit: item.model_tokens_limitation,
                tokensPrice: item.price,
                robotid: item.robotid,
                id: item.id,
                icon: item.icon,
            }));
        })
        .catch(_error => {
            ElMessage({
                type: 'error',
                message: 'Failed to fetch models',
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
const openAddingDialog = (row: any) => {
    settingModel.value = { ...row };
    AddDialogVisible.value = true;
    InputEnable.value = true;

}
// const addNewModal = () => {
//     let formData = new FormData();
//     formData.append('name', settingModel.value.name);
//     formData.append('model_tokens_limitation', settingModel.value.tokensLimit);
//     formData.append('id' , settingModel.value.id);
//     formData.append('price', settingModel.value.tokensPrice);
//     conn.post('/admin/robot/add', {
//         data: formData
//     }, {
//         headers: { 'Authorization': 'Bearer ' + global.token }
//     })
//         .then(() => {
//             ElMessage({
//                 type: 'success',
//                 message: 'Add successfully',
//             });
//             fetchModels();
//         })
//         .catch(() => {
//             ElMessage({
//                 type: 'error',
//                 message: 'Failed to add model',
//             });
//         });
// }

const onDialogConfirm = () => {
    const base_model_id = settingModel.value.id;
    let formData = new FormData();
    formData.append('name', settingModel.value.name);
    formData.append('id', settingModel.value.id);
    formData.append('model_tokens_limitation', settingModel.value.tokensLimit);
    formData.append('price', settingModel.value.tokensPrice);

    conn.post(`/admin/robot/update/${base_model_id}`, {
        data: formData
    }, {
        headers: { 'Authorization': 'Bearer ' + global.token }
    })
        .then(() => {
            ElMessage({
                type: 'success',
                message: 'Update successfully',
            });
            fetchModels();
            InputEnable.value = true;
            settingDialogVisible.value = false;
            AddDialogVisible.value = false;
        })
        .catch(() => {
            ElMessage({
                type: 'error',
                message: 'Failed to update model',
            });
        });
};

const deleteModel = (index: number) => {
    const model = models.value[index];
    const base_model_id = model.id;
    conn.delete(`/admin/robot/update/1`, {
        data: { base_model_id },
        headers: { 'Authorization': 'Bearer ' + global.token }
    })
        .then(() => {
            ElMessage({
                type: 'success',
                message: 'Delete successfully',
            });
            fetchModels();
        })
        .catch(() => {
            ElMessage({
                type: 'error',
                message: 'Failed to delete model',
            });
        });
};
function inputFile(event: any){
    settingModel.value.filename = event.target.files[0].name;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (e) {
        settingModel.value.icon = e.target?.result as any;
    };
}

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
.left-icon-button {
    margin-right: auto;
}
.robot-icon {
    width: 50px;
    height: 50px;
    object-fit: cover;
}

</style>