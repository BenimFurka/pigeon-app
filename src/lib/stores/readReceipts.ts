import { writable } from 'svelte/store';

export const readReceipts = writable<Record<number, number>>({});

export function setReadUpTo(chatId: number, messageId: number): void {
    readReceipts.update((m) => {
        const next = { ...m };
        const prev = next[chatId] ?? 0;
        next[chatId] = Math.max(prev, messageId);
        return next;
    });
}

export function setAllRead(chatId: number): void {
    readReceipts.update((m) => {
        const next = { ...m };
        next[chatId] = Number.MAX_SAFE_INTEGER;
        return next;
    });
}
