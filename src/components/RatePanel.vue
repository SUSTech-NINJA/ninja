<script setup>
import {ref, watch} from 'vue';
import {useGlobalStore} from "../stores/global";
import {createConnection, toasterOptions} from "../config";
import {createToaster} from "@meforma/vue-toaster";

const props = defineProps({
    robotid: String,
    userid: String,
});

const rate = ref(0), comment = ref('');
const colors = ref(['#99A9BF', '#F7BA2A', '#FF9900']);
const global = useGlobalStore();
const conn = createConnection();
const toaster = createToaster(toasterOptions);

function submitRating() {
    let formData = new FormData();
    formData.append('rate', rate.value);
    formData.append('content', comment.value);
    formData.append('userid', props.userid);
    conn.post('/robot/post/' + props.robotid, formData, {
        headers: {'Authorization': 'Bearer ' + global.token}
    })
        .then(res => {
            toaster.show('Rating submitted', {type: 'success'});
            global.dialogs.rate = false;
        })
        .catch(err => {
            if (err.status === 403) {
                toaster.show('You already rated', {type: 'error'});
            } else
                toaster.show('Rating failed', {type: 'error'});
        });
}

watch(() => global.dialogs.rate, (newVal) => {
    if (newVal) {
        rate.value = 0;
        comment.value = '';
    }
});
</script>

<template>
    <el-dialog title="Rate the robot" v-model="global.dialogs.rate">
        <el-form label-width="auto">
            <el-form-item label="Rate">
                <el-rate v-model="rate" :colors="colors" :show-score="rate !== 0"/>
            </el-form-item>
            <el-form-item label="Comment">
                <el-input v-model="comment" type="textarea"/>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="global.dialogs.rate = false">Cancel</el-button>
                <el-button type="primary" @click="submitRating">
                    Submit
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>

</style>