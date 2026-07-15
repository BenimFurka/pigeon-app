import { writable } from 'svelte/store';

// TODO: use more
export const activeChatId = writable<number | null>(null);
