import { writable } from 'svelte/store';
import { getApiUrl } from '../config';

export const loggedIn = writable(false);
export const currentUser = writable(null);
export const authError = writable(null);
export const isLoading = writable(false);

async function makeAuthRequest(endpoint, data) {
    isLoading.set(true);
    authError.set(null);
    console.log('Sending request to', endpoint, data);
    try {
        const response = await fetch(getApiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data }), 
            credentials: 'include'
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'An unknown error occurred.');
        }
        return result;
    } catch (error) {
        authError.set(error.message);
        console.error(`Auth request to ${endpoint} failed:`, error);
        return null;
    } finally {
        isLoading.set(false);
    }
}

export async function login(login, password) {
    const result = await makeAuthRequest('auth/login', { login, password });
    if (result) {
        loggedIn.set(true);
    }
}

export async function register(username, email, password, display) {
    if (password.length < 6) {
        authError.set('Password must be at least 6 characters long.');
        return false;
    }
    if (!email.includes('@')) {
        authError.set('Please enter a valid email.');
        return false;
    }
    const result = await makeAuthRequest('auth/register', { username, email, password, display });
    return !!result;
}

export async function verifyEmail(email, code) {
    const result = await makeAuthRequest('auth/verify', { email, code: parseInt(code) });
    if (result) {
        loggedIn.set(true);
    }
}

export async function requestPasswordReset(email) {
    const result = await makeAuthRequest('auth/reset', { email });
    return !!result;
}

export async function verifyPasswordReset(email, code, new_password) {
    if (new_password.length < 6) {
        authError.set('New password must be at least 6 characters long.');
        return false;
    }
    const result = await makeAuthRequest('auth/reset-verify', { email, code: parseInt(code), new_password });
    if (result) {
        loggedIn.set(true);
    }
}

export async function logout() {
    loggedIn.set(false);
    currentUser.set(null);
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
