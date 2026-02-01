import { writable } from 'svelte/store';

export type ChatNavigationRequest = {
    chatId: number;
    requestId: number;
};

const chatNavigationStore = writable<ChatNavigationRequest | null>(null);

let requestCounter = 0;

export function requestChatOpen(chatId: number) {
    requestCounter += 1;
    chatNavigationStore.set({ chatId, requestId: requestCounter });
}

export function clearChatOpenRequest() {
    chatNavigationStore.set(null);
}

export const chatNavigationTarget = {
    subscribe: chatNavigationStore.subscribe,
};
