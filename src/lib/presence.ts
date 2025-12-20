import { get } from 'svelte/store';
import { presence } from '../stores/presence';
import { formatLastSeen } from './datetime';

export function getUserPresence(userId: number | null | undefined) {
    if (!userId) {
        return { isOnline: false, lastSeenText: null };
    }
    
    const presenceData = get(presence)[userId];
    const isOnline = Boolean(presenceData?.online);
    
    let lastSeenText = null;
    if (presenceData) {
        if (isOnline) {
            lastSeenText = 'В сети';
        } else if (presenceData.lastSeenAt) {
            lastSeenText = `Был(а) ${formatLastSeen(presenceData.lastSeenAt)}`;
        } else if (presenceData.updatedAt) {
            lastSeenText = `Был(а) ${formatLastSeen(presenceData.updatedAt)}`;
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

// TODO: ...
export function subscribeToPresence(
    userId: number | null | undefined, 
    callback: (isOnline: boolean, lastSeenText: string | null) => void
) {
    if (!userId) {
        return () => {};
    }
    
    return presence.subscribe(($presence) => {
        console.log($presence)
        const presenceData = $presence[userId];
        if (!presenceData) {
            callback(false, null);
            return;
        }
        
        const isOnline = Boolean(presenceData.online);
        let lastSeenText = "не в сети";
        
        if (isOnline) {
            lastSeenText = 'В сети';
        } else if (presenceData.lastSeenAt) {
            lastSeenText = formatLastSeen(presenceData.lastSeenAt);
        } else if (presenceData.updatedAt) {
            lastSeenText = formatLastSeen(presenceData.updatedAt);
        } else {
            lastSeenText = "не в сети";
        }
        
        callback(isOnline, lastSeenText);
    });
}
