import { writable, get } from 'svelte/store';
import type { MessageReaction } from '../types/models';

export type ReactionState = Record<number, MessageReaction[]>;

const { subscribe, set, update } = writable<ReactionState>({});

function isValidMessageId(messageId: number | null | undefined): messageId is number {
    return typeof messageId === 'number' && Number.isFinite(messageId) && messageId > 0;
}

function addReaction(messageId: number, reaction: MessageReaction) {
    if (!isValidMessageId(messageId) || !reaction) return;
    
    update((state) => {
        const currentReactions = state[messageId] || [];
        const existingIndex = currentReactions.findIndex(r => r.id === reaction.id);
        
        if (existingIndex >= 0) {
            const updatedReactions = [...currentReactions];
            updatedReactions[existingIndex] = reaction;
            return { ...state, [messageId]: updatedReactions };
        } else {
            return { ...state, [messageId]: [...currentReactions, reaction] };
        }
    });
}

function removeReaction(messageId: number, reactionId: number) {
    if (!isValidMessageId(messageId) || !reactionId) return;
    
    update((state) => {
        const currentReactions = state[messageId] || [];
        const filteredReactions = currentReactions.filter(r => r.id !== reactionId);
        
        if (filteredReactions.length === 0) {
            const newState = { ...state };
            delete newState[messageId];
            return newState;
        }
        
        return { ...state, [messageId]: filteredReactions };
    });
}

function setReactions(messageId: number, reactions: MessageReaction[]) {
    if (!isValidMessageId(messageId)) return;
    
    update((state) => {
        if (!reactions || reactions.length === 0) {
            const newState = { ...state };
            delete newState[messageId];
            return newState;
        }
        
        return { ...state, [messageId]: reactions };
    });
}

function handleReactionAdded(messageId: number, reaction: MessageReaction) {
    addReaction(messageId, reaction);
}

function handleReactionRemoved(messageId: number, reactionId: number) {
    removeReaction(messageId, reactionId);
}

function getReactions(messageId: number): MessageReaction[] {
    if (!isValidMessageId(messageId)) return [];
    const state = get({ subscribe });
    return state[messageId] || [];
}

function clear() {
    set({});
}

function clearMessage(messageId: number) {
    if (!isValidMessageId(messageId)) return;
    
    update((state) => {
        const newState = { ...state };
        delete newState[messageId];
        return newState;
    });
}

export const reactions = {
    subscribe,
    addReaction,
    removeReaction,
    setReactions,
    handleReactionAdded,
    handleReactionRemoved,
    get: getReactions,
    clear,
    clearMessage,
};
