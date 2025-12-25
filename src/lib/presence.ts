import { get } from 'svelte/store';
import { presence } from '../stores/presence';
import { formatLastSeen } from './datetime';

export function getUserPresence(userId: number | null | undefined) {
    if (!userId) {
        return { isOnline: false, lastSeenText: "не в сети" };
    }
    
    const presenceData = get(presence)[userId];
    const isOnline = Boolean(presenceData?.online);
    
    let lastSeenText = "не в сети";
    if (presenceData) {
        if (isOnline) {
            lastSeenText = 'в сети';
        } else if (presenceData.lastSeenAt) {
            lastSeenText = formatLastSeen(presenceData.lastSeenAt) || "не в сети";
        } else if (presenceData.updatedAt) {
            lastSeenText = formatLastSeen(presenceData.updatedAt) || "не в сети";
        }
    }
    
    return { isOnline, lastSeenText };
}

export function getMultipleUserPresence(userIds: (number | null | undefined)[]) {
    const result: Record<number, { isOnline: boolean; lastSeenText: string | null }> = {};
    
    for (const userId of userIds) {
        if (userId) {
            result[userId] = getUserPresence(userId);
        }
    }
    
    return result;
}

export function subscribeToPresence(
    userId: number | null | undefined, 
    callback: (isOnline: boolean, lastSeenText: string) => void
) {
    if (!userId) {
        return () => {};
    }
    
    return presence.subscribe(($presence) => {
        const presenceData = $presence[userId];
        if (!presenceData) {
            callback(false, "не в сети");
            return;
        }
        
        const isOnline = Boolean(presenceData.online);
        let lastSeenText = "не в сети";
        
        if (isOnline) {
            lastSeenText = 'в сети';
        } else if (presenceData.lastSeenAt) {
            lastSeenText = formatLastSeen(presenceData.lastSeenAt) || "не в сети";
        } else if (presenceData.updatedAt) {
            lastSeenText = formatLastSeen(presenceData.updatedAt) || "не в сети";
        }
        
        callback(isOnline, lastSeenText);
    });
}
