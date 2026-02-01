import { writable } from 'svelte/store';
import type { ApiResponse, AuthResponse } from '$lib/types/models';
import { makeRequest } from '$lib/api';

export const loggedIn = writable<boolean>(false);
export const currentUser = writable<number | null>(null);
export const authError = writable<string | null>(null);

export const emailForVerification = writable<string>('');
export const needsEmailVerification = writable<boolean>(false);

async function makeAuthRequest<T = any>(endpoint: string, body?: any, includeAuth = false): Promise<{ response?: ApiResponse<T>; status?: number }> {
    try {
        const response = await makeRequest<T>(endpoint, body, includeAuth);
        return { response };
    } catch (err: any) {
        console.error(err);
        const errorMessage = err?.message || 'An unknown error occurred';
        authError.set(errorMessage);
        return { status: err?.status };
    }
}

export async function login(login: string, password: string) {
    const { response, status } = await makeAuthRequest<AuthResponse>('auth/login', { data: { login, password } });
    if (status === 403) {
        emailForVerification.set(login);
        needsEmailVerification.set(true);
        return false;
    }
    
    if(response?.data) {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        updateTokenTimestamp();
        currentUser.set(user.id);
        loggedIn.set(true);
        needsEmailVerification.set(false);
        return true;
    }
    return false;
}

export async function verifyEmail(email: string, code: string) {
    const { response } = await makeAuthRequest<AuthResponse>('auth/verify', { data: { email, code } });
    if (response && response.data) {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        updateTokenTimestamp();
        currentUser.set(user.id);
        loggedIn.set(true);
    }
}

export async function verifyPasswordReset(email: string, code: string, new_password: string) {
    if (new_password.length < 6) {
        authError.set('New password must be at least 6 characters long.');
        return false;
    }
    const { response } = await makeAuthRequest<AuthResponse>('auth/password/reset/confirm', { data: { email, code, new_password } });
    if (response && response.data) {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        updateTokenTimestamp();
        currentUser.set(user.id);
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
    const { response } = await makeAuthRequest('auth/register', { data: { username, email, password, name } });
    return !!response && !response.error;
}

export async function requestPasswordReset(login: string) {
    const { response } = await makeAuthRequest('auth/password/reset/request', { data: { login } });
    return !!response && !response.error;
}

const TOKEN_EXPIRY_BUFFER = 1 * 60 * 1000;

export function shouldRefreshToken(): boolean {
    const expiryTime = Number(localStorage.getItem('token_expiry'));
    
    if (isNaN(expiryTime) || Date.now() >= expiryTime) {
        return true;
    }
    
    return (expiryTime - Date.now()) < TOKEN_EXPIRY_BUFFER;
}

const TOKEN_UPDATE_KEY = 'last_token_update';

function updateTokenTimestamp() {
    localStorage.setItem(TOKEN_UPDATE_KEY, Date.now().toString());
}

export function shouldRefreshTokens(): boolean {
    const lastUpdate = localStorage.getItem(TOKEN_UPDATE_KEY);
    if (!lastUpdate) return true;
    
    const thirtyMinutes = 1 * 60 * 1000;
    return Date.now() - parseInt(lastUpdate, 10) > thirtyMinutes;
}

export async function refreshTokens() {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            loggedIn.set(false);
            return;
        }

        const { response } = await makeAuthRequest<AuthResponse>('auth/refresh', { data: { refresh_token: refreshToken } });
        
        if (response && response.data) {
            if (response.data.access_token) {
                localStorage.setItem('access_token', response.data.access_token);
                loggedIn.set(true);
            } else {
                throw new Error('Invalid token data');
            }
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
