import axios from "axios";

export const toasterOptions = {
    position: 'top',
    duration: 3000,
};

//export const host = 'http://127.0.0.1:4523/m1/5188287-4853858-default';

export const host = 'https://ninjachat.benx.dev/api';

export function createConnection() {
    return axios.create({
        baseURL: host,
        timeout: 10000
    });
}

export const baseModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-vision-preview'
];
export const visualModels = [
    'gpt-4o',
    'gpt-4-vision-preview',
    'gpt-4o-mini'
];

export function todo() {
    alert("Not yet implemented");
}