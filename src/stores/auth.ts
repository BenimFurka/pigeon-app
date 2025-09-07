import { writable } from 'svelte/store';
import { ApiResponse } from '../types/api';
import { makeRequest } from '../utils/api';

export const loggedIn = writable<boolean>(false);
export const currentUser = writable<number | null>(null);
export const authError = writable<string | null>(null);

async function makeAuthRequest(endpoint: string, body?: any, includeAuth = false): Promise<ApiResponse | undefined> {
    try {
        return await makeRequest(endpoint, body, includeAuth);
    } catch (err) {
        console.error(err);
        authError.set(err as string);
        return undefined;
    }
}

export async function login(login: string, password: string) {
    const result = await makeAuthRequest('auth/login', JSON.stringify({ data: { login, password } }));
    if (result && result.success && result.data) {
        localStorage.setItem('access_token', result.data.access_token);
        localStorage.setItem('refresh_token', result.data.refresh_token);
        loggedIn.set(true);
    }
}

export async function verifyEmail(email: string, code: number) {
    const result = await makeAuthRequest('auth/verify', JSON.stringify({ data: { email, code } }));
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
    const result = await makeAuthRequest('auth/reset-verify', JSON.stringify({ data: { email, code, new_password } }));
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
    const result = await makeAuthRequest('auth/register', JSON.stringify({ data: { username, email, password, name } }));
    return !!result;
}

export async function requestPasswordReset(email: string) {
    const result = await makeAuthRequest('auth/reset', JSON.stringify({ data: { email } }));
    return !!result;
}

const TOKEN_EXPIRY_BUFFER = 15 * 60 * 1000;

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

        const result = await makeAuthRequest('auth/refresh', JSON.stringify({ data: { refresh_token: refreshToken }}));
        
        if (result && result.success && result.data) {
            if (result.data.access_token && result.data.refresh_token) {
                localStorage.setItem('access_token', result.data.access_token);
                localStorage.setItem('refresh_token', result.data.refresh_token);
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
