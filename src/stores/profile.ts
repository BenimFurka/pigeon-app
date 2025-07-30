import { get, writable } from 'svelte/store';
import { getApiUrl } from '../config';
import { ApiResponse } from '../types/api';
import { invoke } from '@tauri-apps/api/tauri';
import { makeRequest } from '../utils/api';

export interface Profile {
    name: string;
    username: string;
    description?: string;
    id: number;
    is_bot: boolean;
}

interface ProfileStore {
    [id: string]: {
        data: Profile | null;
        loading: boolean;
        error: string | null;
        lastUpdated: number | null;
    };
}

interface ProfileCache {
    subscribe: ReturnType<typeof writable<ProfileStore>>['subscribe'];
    getProfile: (id: number, forceRefresh?: boolean) => Promise<Profile | null>;
    getCurrentProfile: () => Promise<Profile | null>;
    invalidate: (id: number) => void;
    initializeCache: () => Promise<void>;
}

const { subscribe, update } = writable<ProfileStore>({});
const cacheName = 'profile-cache';
const CACHE_TTL = 5 * 60 * 1000;

async function initializeCache(): Promise<void> {
    try {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        console.log(`[Profiles] Cache initialized with ${requests.length} entries`);
    } catch (error) {
        console.error('[Profiles] Cache initialization error:', error);
    }
}

async function getProfile(id: number, forceRefresh = false): Promise<Profile | null> {
    const now = Date.now();
    const idKey = String(id);
    
    update(store => ({
        ...store,
        [idKey]: {
            data: store[idKey]?.data || null,
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
        const url = `users/${id}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        const accessToken = localStorage.getItem('access_token');

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
            
        let profileData: Profile;
        
        if (!forceRefresh) {
            const cachedResponse = await cache.match(getApiUrl(url));
            if (cachedResponse) {
                try {
                    profileData = await cachedResponse.json();
                    updateStore(idKey, profileData, now);
                    return profileData;
                } catch (error) {
                    console.warn(`[Profiles] Corrupted cache for ${id}`, error);
                    await cache.delete(getApiUrl(url));
                }
            }
        }

        let req = await makeRequest(url, null, true, "POST");
        profileData = req.data as Profile;

        await cache.put(getApiUrl(url), new Response(JSON.stringify(profileData), {
            headers: { 'Content-Type': 'application/json' }
        }));
        
        updateStore(idKey, profileData, now);
        return profileData;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Profiles] Failed to fetch profile ${id}:`, errorMsg);
        
        update(store => ({
            ...store,
            [idKey]: {
                data: store[idKey]?.data || null,
                loading: false,
                error: errorMsg,
                lastUpdated: store[idKey]?.lastUpdated || null
            }
        }));
        
        return null;
    }
}

function updateStore(idKey: string, data: Profile | null, timestamp: number) {
    update(store => ({
        ...store,
        [idKey]: {
            data,
            loading: false,
            error: null,
            lastUpdated: timestamp
        }
    }));
}

function invalidate(id: number): void {
    const idKey = String(id);
    
    update(store => {
        const newState = { ...store };
        if (newState[idKey]) {
            newState[idKey] = {
                ...newState[idKey],
                lastUpdated: null
            };
        }
        return newState;
    });
    
    caches.open(cacheName).then(cache => {
        const requestUrl = getApiUrl(`users/${id}`);
        cache.delete(requestUrl);
        console.log(`[Profiles] Cache invalidated for user ${id}`);
    });
}

async function getCurrentProfile(): Promise<Profile|null> {
    const cache = await caches.open(cacheName);
    const requestUrl = getApiUrl(`users`);

    let profileData: Profile | null = null;
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }


    if (window.__TAURI__) {
        const options = {
            url: requestUrl,
            headers: headers,
            data: {}
        }

        const responseData: ApiResponse | string = await invoke('make_request', options);

        if (typeof responseData === "string") {
            throw new Error('Unexpected string response');
        }

        if (!responseData.success) {
            throw new Error(responseData.message || 'Failed to fetch profile');
        }

        profileData = responseData.data as Profile;

        
    } else {
        const responseData = await fetch(requestUrl, { 
            method: 'POST', 
            headers: headers,
        })


        if (!responseData.ok) {
            return null;
        }

        const json = await responseData.json();
        profileData = json as Profile;
    }
    
    const now = Date.now();
    const idKey: string = String(profileData.id);

    await cache.put(requestUrl, new Response(JSON.stringify(profileData), {
        headers: { 'Content-Type': 'application/json' }
    }));
    
    
    updateStore(idKey, profileData, now);
    return profileData;
}

export const profiles: ProfileCache = {
    subscribe,
    getProfile,
    getCurrentProfile,
    invalidate,
    initializeCache
};