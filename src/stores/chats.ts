import { get, writable } from 'svelte/store';
import { getApiUrl } from '../config';
import { makeRequest } from '../lib/api';

export interface Chat {
    id: string;
    chat_type: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    owner_id: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

interface ChatsState {
    chats: Chat[];
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
}

const initialState: ChatsState = {
    chats: [],
    loading: false,
    error: null,
    lastUpdated: null
};

const { subscribe, set, update } = writable<ChatsState>(initialState);

async function loadChats(force = false): Promise<Chat[] | null> {
    try {
        update(state => ({
            ...state,
            loading: true,
            error: null
        }));

        const response = await makeRequest('/chats', null, true, 'GET');
        
        if (response.success && response.data) {
            const chats = response.data as Chat[];
            update(state => ({
                chats,
                loading: false,
                error: null,
                lastUpdated: Date.now()
            }));
            return chats;
        }
        
        throw new Error(response.message || 'Failed to load chats');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        update(state => ({
            ...state,
            loading: false,
            error: errorMessage
        }));
        console.error('Error loading chats:', error);
        return null;
    }
}

function clearChats() {
    set(initialState);
}

function initializeCache() {
    // TODO: later ok yeah
    // return loadChats();
}

export const chats = {
    subscribe,
    loadChats,
    clearChats,
    initializeCache
};
