import { writable } from 'svelte/store';
import { getApiUrl } from '../config';
import { invoke } from '@tauri-apps/api/tauri';
import { ApiResponse } from '../types/body';

export const loggedIn = writable<boolean>(false);
export const currentUser = writable<number | null>(null);
export const authError = writable<string | null>(null);

async function makeAuthRequest(endpoint: string, data?: any, includeAuth = false): Promise<ApiResponse | undefined> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }
        }

        if (window.__TAURI__) {
            const url = getApiUrl(endpoint);

            const options = {
                url,
                data: { data: data},
                headers
            }

            const res: ApiResponse | string = await invoke('make_request', { 
                options
            });

            if (typeof res === "string") { 
                authError.set(res); 
                return undefined;
            }
            
            if (res.success === true) return res; 
            else { 
                authError.set(res.message); 
                return undefined;
            }
            
        } else {
            const res = await fetch(getApiUrl(endpoint), { 
                method: 'POST', 
                headers: headers,
                body: JSON.stringify({data: data})
            });

            if (!res.ok) {
                const errorData = await res.json();
                authError.set(errorData.message || 'Request failed');
                return undefined;
            }

            return await res.json() as ApiResponse;
        }
    } catch (err) {
        console.error(err);
        return undefined;
    }
}

export async function login(login: string, password: string) {
    const result = await makeAuthRequest('auth/login', { login, password });
    if (result && result.success && result.data) {
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        loggedIn.set(true);
    }
}

export async function verifyEmail(email: string, code: number) {
    const result = await makeAuthRequest('auth/verify', { email, code });
    if (result && result.success && result.data) {
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        loggedIn.set(true);
    }
}

export async function verifyPasswordReset(email: string, code: number, new_password: string) {
    if (new_password.length < 6) {
        authError.set('New password must be at least 6 characters long.');
        return false;
    }
    const result = await makeAuthRequest('auth/reset-verify', { email, code, new_password });
    if (result && result.success && result.data) {
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        loggedIn.set(true);
        return true;
    }
    return false;
}

export async function logout() {
    loggedIn.set(false);
    currentUser.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

export async function register(username: string, email: string, password: string, name: string) {
    if (password.length < 6) {
        authError.set('Password must be at least 6 characters long.');
        return false;
    }
    if (!email.includes('@')) {
        authError.set('Please enter a valid email.');
        return false;
    }
    const result = await makeAuthRequest('auth/register', { username, email, password, name });
    return !!result;
}

export async function requestPasswordReset(email: string) {
    const result = await makeAuthRequest('auth/reset', { email });
    return !!result;
}

const TOKEN_EXPIRY_BUFFER = 15 * 60 * 1000;

// TODO: Отредачить ща лень
export function shouldRefreshToken(): boolean {
    const expiryTime = Number(localStorage.getItem('token_expiry'));
    
    if (isNaN(expiryTime) || Date.now() >= expiryTime) {
        return true;
    }
    
    return (expiryTime - Date.now()) < TOKEN_EXPIRY_BUFFER;
}

export async function refreshTokens() {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            loggedIn.set(false);
            return;
        }

        const result = await makeAuthRequest('auth/refresh', { refresh_token: refreshToken });
        
        if (result && result.success && result.data) {
            localStorage.setItem('access_token', result.data.access_token);
            localStorage.setItem('refresh_token', result.data.refresh_token);
            loggedIn.set(true);
        } else {
            throw new Error('Refresh failed');
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        loggedIn.set(false);
    }
}
