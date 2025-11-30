import { writable, get } from 'svelte/store';

interface TypingState {
    [chatId: number]: {
        [userId: number]: number;
    };
}

const initialState: TypingState = {};

const { subscribe, set, update } = writable<TypingState>(initialState);

const TYPING_TIMEOUT = 3000;

function cleanupTyping(chatId: number, userId: number) {
    update(state => {
        const chatState = state[chatId];
        if (!chatState) return state;
        
        const newChatState = { ...chatState };
        delete newChatState[userId];
        
        if (Object.keys(newChatState).length === 0) {
            const newState = { ...state };
            delete newState[chatId];
            return newState;
        }
        
        return {
            ...state,
            [chatId]: newChatState
        };
    });
}

export function setTyping(chatId: number, userId: number, isTyping: boolean) {
    update(state => {
        if (!isTyping) {
            const chatState = state[chatId];
            if (!chatState || !chatState[userId]) return state;
            
            const newChatState = { ...chatState };
            delete newChatState[userId];
            
            if (Object.keys(newChatState).length === 0) {
                const newState = { ...state };
                delete newState[chatId];
                return newState;
            }
            
            return {
                ...state,
                [chatId]: newChatState
            };
        }
        
        const now = Date.now();
        return {
            ...state,
            [chatId]: {
                ...state[chatId],
                [userId]: now
            }
        };
    });
    
    if (isTyping) {
        setTimeout(() => {
            cleanupTyping(chatId, userId);
        }, TYPING_TIMEOUT);
    }
}

export function getTypingUsers(chatId: number): number[] {
    const state = get({ subscribe });
    const chatState = state[chatId];
    if (!chatState) return [];
    
    const now = Date.now();
    return Object.entries(chatState)
        .filter(([_, timestamp]) => now - timestamp < TYPING_TIMEOUT)
        .map(([userId, _]) => Number(userId));
}

export function clearTyping(chatId: number) {
    update(state => {
        const newState = { ...state };
        delete newState[chatId];
        return newState;
    });
}

export const typing = {
    subscribe,
    setTyping,
    getTypingUsers,
    clearTyping
};

