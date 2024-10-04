import Dayjs from "dayjs";

export function addHoverClass(e) {
    e.target.classList.add('is-hovering');
}

export function removeHoverClass(e) {
    e.target.classList.remove('is-hovering');
}

export function addActiveClass(e) {
    e.target.classList.add('is-selected');
}

export function removeActiveClass(e) {
    e.target.classList.remove('is-selected');
}

export function getTimeString(timestamp: number) {
    const date = Dayjs(timestamp);
    return date.format('MM-DD HH:mm:ss');
}

export function firstUpperCase(str: string) {
    return str.replace(/^\S/, s => s.toUpperCase());
}