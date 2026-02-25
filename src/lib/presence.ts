import { get } from 'svelte/store';
import { presence } from '$lib/stores/presence';

export function getUserPresence(userId: number | null | undefined) {
    if (!userId) {
        return { isOnline: false, lastSeenAt: null };
    }
    
    const presenceData = get(presence)[userId];
    const isOnline = Boolean(presenceData?.online);
    
    return { isOnline, lastSeenAt: presenceData?.lastSeenAt || presenceData?.updatedAt || null };
}

export function getMultipleUserPresence(userIds: (number | null | undefined)[]) {
    const result: Record<number, { isOnline: boolean; lastSeenAt: string | null }> = {};
    
    for (const userId of userIds) {
        if (userId) {
            result[userId] = getUserPresence(userId);
        }
    }
    
    return result;
}

export function subscribeToPresence(
    userId: number | null | undefined, 
    callback: (isOnline: boolean, lastSeenAt: string | null) => void
) {
    if (!userId) {
        return () => {};
    }
    
    return presence.subscribe(($presence) => {
        const presenceData = $presence[userId];
        if (!presenceData) {
            callback(false, null);
            return;
        }
        
        const isOnline = Boolean(presenceData.online);
        const lastSeenAt = presenceData.lastSeenAt || presenceData.updatedAt || null;
        
        callback(isOnline, lastSeenAt);
    });
}
