import { writable } from 'svelte/store';
import { getApiUrl } from '../config';
import { invoke } from '@tauri-apps/api/tauri';

export const loggedIn = writable(false);
export const currentUser = writable(null);
export const authError = writable(null);

async function makeAuthRequest(endpoint, data) {
    try {
        if (window.__TAURI__) {
            const url = getApiUrl(endpoint)
            const res = await invoke('make_request', { url: url, data: { data: data } });
            
			if (res.success === true) return res; else { authError.set(res.message) }
        } else {
            const res = await fetch(getApiUrl(endpoint), { 
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return await res.json();
        }
    } catch (err) {
        console.error(err);
        return null;
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
