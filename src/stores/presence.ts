import { writable, get } from 'svelte/store';

export type PresenceRecord = {
    online: boolean;
    lastSeenAt: string | null;
    updatedAt: string;
};

type PresenceState = Record<number, PresenceRecord>;

const { subscribe, set, update } = writable<PresenceState>({});

function isValidUserId(userId: number | null | undefined): userId is number {
    return typeof userId === 'number' && Number.isFinite(userId) && userId > 0;
}

function createPresenceRecord(partial: Partial<PresenceRecord>, fallback: PresenceRecord | undefined = undefined): PresenceRecord {
    const now = new Date().toISOString();
    const online = partial.online ?? fallback?.online ?? false;
    const lastSeenAt = partial.lastSeenAt ?? fallback?.lastSeenAt ?? null;
    
    return {
        online,
        lastSeenAt: online ? now : lastSeenAt,
        updatedAt: partial.updatedAt ?? fallback?.updatedAt ?? now,
    };
}

function setOnline(userId: number, lastSeenAt?: string | null) {
    if (!isValidUserId(userId)) return;
    
    update((state) => {
        const prev = state[userId];
        const now = new Date().toISOString();
        
        const next = createPresenceRecord({ 
            online: true, 
            lastSeenAt: lastSeenAt ?? prev?.lastSeenAt ?? now,
            updatedAt: now 
        }, prev);
        
        return { ...state, [userId]: next };
    });
}

function setOffline(userId: number, lastSeenAt?: string | null) {
    if (!isValidUserId(userId)) return;
    
    const timestamp = new Date().toISOString();
    update((state) => {
        const prev = state[userId];
        
        const next = createPresenceRecord({ 
            online: false, 
            lastSeenAt: lastSeenAt ?? timestamp,
            updatedAt: timestamp 
        }, prev);
        
        return { ...state, [userId]: next };
    });
}

function setManyOnline(userIds: number[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    const timestamp = new Date().toISOString();
    update((state) => {
        const nextState: PresenceState = { ...state };
        for (const id of userIds) {
            if (!isValidUserId(id)) continue;
            const prev = nextState[id];
            nextState[id] = createPresenceRecord({ online: true, updatedAt: timestamp }, prev);
        }
        return nextState;
    });
}


function clear() {
    set({});
}

function getPresence(userId: number): PresenceRecord | undefined {
    if (!isValidUserId(userId)) return undefined;
    const state = get({ subscribe });
    return state[userId];
}

export const presence = {
    subscribe,
    setOnline,
    setOffline,
    setManyOnline,
    clear,
    get: getPresence,
};
