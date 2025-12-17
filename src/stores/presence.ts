import { writable, get } from 'svelte/store';
import { queryClient } from '$lib/query';

export type PresenceRecord = {
    online: boolean;
    lastSeenAt: string | null;
    updatedAt: string;
};

type PresenceState = Record<number, PresenceRecord>;

const { subscribe, set, update } = writable<PresenceState>({});

const OFFLINE_THRESHOLD = 5 * 60 * 1000;

const STATUS_CHECK_INTERVAL = 30 * 1000;

let statusCheckInterval: NodeJS.Timeout | null = null;

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
        
        if (prev?.online && !isOlderThan(prev.updatedAt, 60 * 1000)) {
            return state;
        }
        
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
        
        if (!prev?.online && !isOlderThan(prev?.updatedAt, 60 * 1000)) {
            return state;
        }
        
        const next = createPresenceRecord({ 
            online: false, 
            lastSeenAt: lastSeenAt ?? timestamp,
            updatedAt: timestamp 
        }, prev);
        
        return { ...state, [userId]: next };
    });
}

function isOlderThan(dateString: string | null | undefined, ms: number): boolean {
    if (!dateString) return true;
    const date = new Date(dateString);
    return Date.now() - date.getTime() > ms;
}

function startStatusChecks() {
    if (statusCheckInterval) return;
    
    statusCheckInterval = setInterval(() => {
        update((state) => {
            const now = Date.now();
            const updatedState = { ...state };
            let hasChanges = false;
            
            Object.entries(state).forEach(([userId, record]) => {
                if (record.online && isOlderThan(record.updatedAt, OFFLINE_THRESHOLD)) {
                    updatedState[parseInt(userId)] = createPresenceRecord({
                        online: false,
                        lastSeenAt: record.updatedAt,
                        updatedAt: new Date(now).toISOString()
                    }, record);
                    hasChanges = true;
                }
            });
            
            return hasChanges ? updatedState : state;
        });
    }, STATUS_CHECK_INTERVAL);
}

function stopStatusChecks() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

startStatusChecks();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopStatusChecks);
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

function merge(entries: Array<{ user_id: number; online: boolean; last_seen_at?: string | null }> | null | undefined) {
    if (!entries || entries.length === 0) return;
    const timestamp = new Date().toISOString();
    update((state) => {
        const nextState: PresenceState = { ...state };
        for (const entry of entries) {
            if (!isValidUserId(entry?.user_id)) continue;
            const prev = nextState[entry.user_id];
            const next = createPresenceRecord({
                online: entry.online,
                lastSeenAt: entry.last_seen_at ?? prev?.lastSeenAt ?? null,
                updatedAt: timestamp,
            }, prev);
            nextState[entry.user_id] = next;
        }
        return nextState;
    });
}

function markLastSeen(userId: number, lastSeenAt: string | null) {
    if (!isValidUserId(userId)) return;
    update((state) => {
        const prev = state[userId];
        const next = createPresenceRecord({ lastSeenAt: lastSeenAt ?? prev?.lastSeenAt ?? null, updatedAt: new Date().toISOString() }, prev);
        return { ...state, [userId]: next };
    });
}

function remove(userId: number) {
    if (!isValidUserId(userId)) return;
    update((state) => {
        if (!state[userId]) return state;
        const next = { ...state };
        delete next[userId];
        return next;
    });
}

function reset() {
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
    merge,
    markLastSeen,
    remove,
    reset,
    get: getPresence,
};
