import { writable } from 'svelte/store';
import { getApiUrl } from '../config';

const { subscribe, update } = writable({});
const etags = {};
const cacheName = 'avatar-cache';

async function initializeCache() {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const count = requests.length;
    console.log(`[Avatars] Initialized with ${count} cached avatars.`);
}

initializeCache().catch(console.error);

async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function getAvatar(userId) {
    const cache = await caches.open(cacheName);
    const requestUrl = getApiUrl(`entity/${userId}/avatar`);
    const cachedResponse = await cache.match(requestUrl);

    if (cachedResponse) {
        const etag = cachedResponse.headers.get('ETag');
        if (etag) {
            etags[userId] = etag;
        }
    }

    const fetchOptions = {
        method: 'GET',
        headers: {},
        credentials: 'include'
    };

    if (etags[userId]) {
        fetchOptions.headers['If-None-Match'] = etags[userId];
    }

    try {
        const response = await fetch(requestUrl, fetchOptions);

        if (response.status === 304) {
            console.log(`[Avatars] Avatar for ${userId} not modified, using cache.`);
            const dataUrl = await blobToDataUrl(await cachedResponse.blob());
            update(store => ({ ...store, [userId]: dataUrl }));
            return dataUrl;
        }

        if (response.ok) {
            const blob = await response.blob();
            const newEtag = response.headers.get('ETag');
            console.log(`[Avatars] Fetched new avatar for ${userId}, ETag: ${newEtag}`);

            await cache.put(requestUrl, new Response(blob.slice(), { headers: { 'ETag': newEtag } }));

            const dataUrl = await blobToDataUrl(blob);
            update(store => ({ ...store, [userId]: dataUrl }));
            etags[userId] = newEtag;
            return dataUrl;
        }

        console.error(`[Avatars] Failed to fetch avatar for ${userId}. Status: ${response.status}`);
        return null;
    } catch (error) {
        console.error(`[Avatars] Network error fetching avatar for ${userId}:`, error);
        return null;
    }
}

async function changeAvatar(userId, file) {
    const requestUrl = getApiUrl(`entity/${userId}/avatar`);
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

    await clearCache(userId);
}

async function clearCache(userId) {
    const cache = await caches.open(cacheName);
    const requestUrl = getApiUrl(`entity/${userId}/avatar`);
    await cache.delete(requestUrl);
    delete etags[userId];
    update(store => {
        const newState = { ...store };
        delete newState[userId];
        return newState;
    });
    console.log(`[Avatars] Cleared cache for user ${userId}`);
}

export const avatars = {
    subscribe,
    getAvatar,
    changeAvatar,
    clearCache
};
