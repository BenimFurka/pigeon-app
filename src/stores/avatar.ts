import { writable, Writable } from 'svelte/store';
import { getApiUrl } from '../config';

interface AvatarStore {
    [id: number]: string | null;
}

interface AvatarCache {
    subscribe: Writable<AvatarStore>['subscribe'];
    getAvatar: (id: number) => Promise<string | null>;
    changeAvatar: (id: number, file: Blob) => Promise<void>;
    clearCache: (id: number) => Promise<void>;
}

const { subscribe, update } = writable<AvatarStore>({});
const etags: Record<number, string> = {};
const cacheName = 'avatar-cache';

async function initializeCache(): Promise<void> {
    try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const count = requests.length;
        console.log(`[Avatars] Initialized with ${count} cached avatars.`);
    } catch (error) {
        console.error('[Avatars] Cache initialization error:', error);
    }
}

initializeCache();

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to data URL'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

async function getAvatar(id: number): Promise<string | null> {
    const cache = await caches.open(cacheName);
    const requestUrl = getApiUrl(`entity/${id}/avatar`);
    const cachedResponse = await cache.match(requestUrl);

    if (cachedResponse) {
        const etag = cachedResponse.headers.get('ETag');
        if (etag) {
            etags[id] = etag;
        }
    }

    const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {} as Record<string, string>,
        credentials: 'include'
    };

    if (etags[id]) {
        (fetchOptions.headers as Record<string, string>)['If-None-Match'] = etags[id];
    }

    try {
        const response = await fetch(requestUrl, fetchOptions);

        if (response.status === 304 && cachedResponse) {
            console.log(`[Avatars] Avatar for ${id} not modified, using cache.`);
            const dataUrl = await blobToDataUrl(await cachedResponse.blob());
            update(store => ({ ...store, [id]: dataUrl }));
            return dataUrl;
        }

        if (response.ok) {
            const blob = await response.blob();
            const newEtag = response.headers.get('ETag');
            console.log(`[Avatars] Fetched new avatar for ${id}, ETag: ${newEtag}`);

            await cache.put(requestUrl, new Response(blob.slice(), { headers: { 'ETag': newEtag || '' } }));

            const dataUrl = await blobToDataUrl(blob);
            update(store => ({ ...store, [id]: dataUrl }));
            if (newEtag) {
                etags[id] = newEtag;
            }
            return dataUrl;
        }

        console.error(`[Avatars] Failed to fetch avatar for ${id}. Status: ${response.status}`);
        return null;
    } catch (error) {
        console.error(`[Avatars] Network error fetching avatar for ${id}:`, error);
        return null;
    }
}

async function changeAvatar(id: number, file: Blob): Promise<void> {
    const requestUrl = getApiUrl(`entity/${id}/avatar`);
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error('Failed to upload new avatar.');
    }

    await clearCache(id);
}

async function clearCache(id: number): Promise<void> {
    const cache = await caches.open(cacheName);
    const requestUrl = getApiUrl(`entity/${id}/avatar`);
    await cache.delete(requestUrl);
    delete etags[id];
    update(store => {
        const newState = { ...store };
        delete newState[id];
        return newState;
    });
    console.log(`[Avatars] Cleared cache for user ${id}`);
}

export const avatars: AvatarCache = {
    subscribe,
    getAvatar,
    changeAvatar,
    clearCache
};