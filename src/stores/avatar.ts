import { get, writable } from 'svelte/store';
import { getApiUrl } from '../config';

interface AvatarState {
    data: string | null;
    etag: string | null;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
}

interface AvatarStore {
    [id: string]: AvatarState;
}

interface AvatarCache {
    subscribe: ReturnType<typeof writable<AvatarStore>>['subscribe'];
    getAvatar: (id: number, forceRefresh?: boolean) => Promise<string | null>;
    changeAvatar: (id: number, file: Blob) => Promise<void>;
    invalidate: (id: number) => void;
    initializeCache: () => Promise<void>;
}

const { subscribe, update } = writable<AvatarStore>({});
const cacheName = 'avatar-cache';
const CACHE_TTL = 5 * 60 * 1000;

async function initializeCache(): Promise<void> {
    try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        console.log(`[Avatars] Cache initialized with ${requests.length} entries`);
    } catch (error) {
        console.error('[Avatars] Cache initialization error:', error);
    }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
}

async function getAvatar(id: number, forceRefresh = false): Promise<string | null> {
    const idKey = String(id);
    const now = Date.now();
    
    update(store => ({
        ...store,
        [idKey]: {
            data: store[idKey]?.data || null,
            etag: store[idKey]?.etag || null,
            loading: true,
            error: null,
            lastUpdated: store[idKey]?.lastUpdated || null
        }
    }));

    try {
        const currentState = get({ subscribe })[idKey];
        const isCacheValid = currentState?.lastUpdated && 
                            (now - currentState.lastUpdated) < CACHE_TTL;

        if (isCacheValid && !forceRefresh && currentState.data) {
            return currentState.data;
        }

        const cache = await caches.open(cacheName);
        const requestUrl = getApiUrl(`entity/${id}/avatar`);
        let dataUrl: string | null = null;

        if (!forceRefresh) {
            const cachedResponse = await cache.match(requestUrl);
            if (cachedResponse) {
                const etag = cachedResponse.headers.get('ETag');
                const blob = await cachedResponse.blob();
                dataUrl = await blobToDataUrl(blob);
                
                updateStore(idKey, dataUrl, etag, now);
                return dataUrl;
            }
        }

        const headers: Record<string, string> = {};
        if (currentState?.etag) headers['If-None-Match'] = currentState.etag;

        const response = await fetch(requestUrl, {
            headers,
            credentials: 'include'
        });

        if (response.status === 304 && currentState?.data) {
            updateStore(idKey, currentState.data, currentState.etag, now);
            return currentState.data;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        dataUrl = await blobToDataUrl(blob);
        const etag = response.headers.get('ETag');

        await cache.put(requestUrl, new Response(blob, {
            headers: { 'ETag': etag || '' }
        }));

        updateStore(idKey, dataUrl, etag, now);
        return dataUrl;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Avatars] Failed to fetch avatar ${id}:`, errorMsg);
        
        update(store => ({
            ...store,
            [idKey]: {
                data: store[idKey]?.data || null,
                etag: store[idKey]?.etag || null,
                loading: false,
                error: errorMsg,
                lastUpdated: store[idKey]?.lastUpdated || null
            }
        }));
        
        return null;
    }
}

async function changeAvatar(id: number, file: Blob): Promise<void> {
    const idKey = String(id);
    const requestUrl = getApiUrl(`entity/${id}/avatar`);
    
    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(requestUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const dataUrl = await blobToDataUrl(file);
        const etag = response.headers.get('ETag');

        updateStore(idKey, dataUrl, etag, Date.now());

        const cache = await caches.open(cacheName);
        await cache.delete(requestUrl);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
        console.error(`[Avatars] Failed to change avatar ${id}:`, errorMsg);
        
        update(store => ({
            ...store,
            [idKey]: {
                ...store[idKey],
                loading: false,
                error: errorMsg
            }
        }));
        
        throw error;
    }
}

function updateStore(idKey: string, data: string | null, etag: string | null, timestamp: number) {
    update(store => ({
        ...store,
        [idKey]: {
            data,
            etag,
            loading: false,
            error: null,
            lastUpdated: timestamp
        }
    }));
}

function invalidate(id: number): void {
    const idKey = String(id);
    
    update(store => {
        if (!store[idKey]) return store;
        return {
            ...store,
            [idKey]: {
                ...store[idKey],
                lastUpdated: null
            }
        };
    });

    caches.open(cacheName).then(cache => {
        const requestUrl = getApiUrl(`entity/${id}/avatar`);
        cache.delete(requestUrl);
        console.log(`[Avatars] Cache invalidated for entity ${id}`);
    });
}

export const avatars: AvatarCache = {
    subscribe,
    getAvatar,
    changeAvatar,
    invalidate,
    initializeCache
};