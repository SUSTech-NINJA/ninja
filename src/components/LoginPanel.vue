<script setup>
import {useGlobalStore} from "../stores/global";
import {ref} from "vue";
import {createToaster} from "@meforma/vue-toaster";
import {createConnection, toasterOptions} from "../config";

const toaster = createToaster(toasterOptions);
const global = useGlobalStore();
const formLabelWidth = '80px';
const loginForm = ref({
    username: '',
    password: '',
    email: ''
}), loginLoading = ref(false);
const conn = createConnection();

function login() {
    if (loginForm.value.username === '' || loginForm.value.password === '') {
        toaster.show('Please fill in all fields', {type: 'error'});
        return;
    }
    loginLoading.value = true;
    let formData = new FormData();
    let username = loginForm.value.username;
    formData.append('username', username);
    formData.append('password', loginForm.value.password);
    conn.post('/login', formData)
        .then(res => {
            loginLoading.value = false;
            if (res.status === 200) {
                global.notLogin = false;
                toaster.show('Login successful', {type: 'success'});
                let json = res.data;
                if (typeof json === 'string') {
                    json = JSON.parse(json);
                }
                global.uuid = json.userid;
                global.token = json.token;
                global.username = username;
                setTimeout(() => {
                    location.reload();
                }, 500);
            } else {
                toaster.show('Login failed', {type: 'error'});
            }
        })
        .catch(err => {
            loginLoading.value = false;
            toaster.show('Login failed', {type: 'error'});
        });
}

function triggerRegister() {
    global.register = true;
    loginForm.value.username = '';
    loginForm.value.password = '';
    loginForm.value.email = '';
}

function register() {
    if (loginForm.value.username === '' || loginForm.value.password === '') {
        toaster.show('Please fill in all fields', {type: 'error'});
        return;
    }
    loginLoading.value = true;
    let formData = new FormData();
    formData.append('username', loginForm.value.username);
    formData.append('password', loginForm.value.password);
    formData.append('email', loginForm.value.email);
    conn.post('/register', formData)
        .then(res => {
            loginLoading.value = false;
            if (res.status === 200) {
                toaster.show('Register successful, now you can log in', {type: 'success'});
                global.register = false;
            } else {
                toaster.show('Register failed', {type: 'error'});
            }
        })
        .catch(err => {
            loginLoading.value = false;
            toaster.show('Register failed', {type: 'error'});
        });
}
</script>

<template>
    <el-dialog
        v-model="global.notLogin"
        title="Login"
        width="500"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
    >
        <el-form :model="loginForm">
            <el-form-item label="Username" :label-width="formLabelWidth">
                <el-input v-model="loginForm.username" autocomplete="off"/>
            </el-form-item>
            <el-form-item label="Password" :label-width="formLabelWidth">
                <el-input v-model="loginForm.password" type="password" autocomplete="off"/>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="w-full grid grid-cols-2">
                <div class="text-left">
                    <el-link type="primary" @click="triggerRegister">Register</el-link>
                </div>
                <div>
                    <el-button type="primary" @click="login" v-loading="loginLoading">
                        Login
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>
    <el-dialog
        v-model="global.register"
        title="Register"
        width="500"
        :modal="false"
    >
        <el-form :model="loginForm">
            <el-form-item label="Username" :label-width="formLabelWidth">
                <el-input v-model="loginForm.username" autocomplete="off"/>
            </el-form-item>
            <el-form-item label="Password" :label-width="formLabelWidth">
                <el-input v-model="loginForm.password" type="password" autocomplete="off"/>
            </el-form-item>
            <el-form-item label="Email" :label-width="formLabelWidth">
                <el-input v-model="loginForm.email" autocomplete="off"/>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="el-dialog__footer">
                <div>
                    <el-button @click="global.register = false">Cancel</el-button>
                    <el-button type="primary" @click="register" v-loading="loginLoading">
                        Register
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>

</style>