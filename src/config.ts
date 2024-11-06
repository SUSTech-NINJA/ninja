import axios from "axios";

export const toasterOptions = {
    position: 'top',
    duration: 3000,
};

export const host = 'http://127.0.0.1:4523/m1/5188287-4853858-default';

export function createConnection() {
    return axios.create({
        baseURL: host,
        timeout: 10000
    });
}
export const baseModels =[
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4o',
    'gpt-o1'
]

export function todo() {
    alert("Not yet implemented");
}