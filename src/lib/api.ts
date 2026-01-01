import type { ApiResponse, ApiError, UserPublic } from "../types/models";
import { getApiUrl } from "../config";
import { getIsTauriEnvironment } from "./tauri-env";

export async function makeRequest<T = any>(
    endpoint: string, 
    body?: any, 
    includeAuth = false, 
    method?: string
): Promise<ApiResponse<T>> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1'
        };

        if (includeAuth) {
            const accessToken = localStorage.getItem('access_token');
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }
        }

        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            const url = getApiUrl(endpoint);

            const options = {
                url: url,
                body: body,
                headers: headers,
                method: method || 'POST'
            }

            const { invoke } = await import('@tauri-apps/api/core');
            const res: ApiResponse<T> | string = await invoke('make_request', {
                options
            });

            if (typeof res === "string") {
                throw new Error(res);
            }

            if (isApiError(res)) {
                throw new Error(res.error.message || 'Request failed');
            }

            return res;

        } else {
            const res = await fetch(getApiUrl(endpoint), {
                method: method || 'POST',
                headers: headers,
                body: body ? JSON.stringify(body) : undefined
            });

            const data: ApiResponse<T> = await res.json();

            if (isApiError(data)) {
                throw new Error(data.error.message || 'Request failed');
            }

            if (!res.ok) {
                throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
            }

            return data;
        }
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Request failed';
        throw new Error(errorMessage);
    }
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiError } {
    return response.error !== undefined;
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
    return response.data !== undefined && response.error === undefined;
}

export async function uploadUserAvatar(
    file: File
): Promise<ApiResponse<UserPublic>> {
    try {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('Файл слишком большой. Максимальный размер: 5MB');
        }

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('Необходима авторизация');
        }

        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            throw new Error('Загрузка аватара в настольной версии пока не поддерживается');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        const res = await fetch(getApiUrl('/users/me/avatar'), {
            method: 'POST',
            headers: {       
                'ngrok-skip-browser-warning': 1,
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data: ApiResponse<UserPublic> = await res.json();

        if (isApiError(data)) {
            throw new Error(data.error.message || 'Request failed');
        }

        if (!res.ok) {
            throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        return data;
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Request failed';
        throw new Error(errorMessage);
    }
}

export async function uploadChatAvatar(
    chatId: number,
    file: File
): Promise<ApiResponse<any>> {
    try {
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('Файл слишком большой. Максимальный размер: 5MB');
        }

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('Необходима авторизация');
        }

        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            throw new Error('Загрузка аватара в настольной версии пока не поддерживается');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        const res = await fetch(getApiUrl(`/chats/${chatId}/avatar`), {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 1,
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data: ApiResponse<any> = await res.json();

        if (isApiError(data)) {
            throw new Error(data.error.message || 'Request failed');
        }

        if (!res.ok) {
            throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        return data;
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Request failed';
        throw new Error(errorMessage);
    }
}

export async function uploadAttachment(
    chatId: number,
    file: File
): Promise<ApiResponse<import("../types/models").ChatAttachment>> {
    try {
        const MAX_FILE_SIZE = 8 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            throw new Error('Файл слишком большой. Максимальный размер: 8MB');
        }

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('Необходима авторизация');
        }

        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            const { invoke } = await import('@tauri-apps/api/core');
            const { writeFile, remove } = await import('@tauri-apps/plugin-fs');
            
            // TODO: tauri
            const tempDir = '/tmp';
            const tempFilePath = `${tempDir}/${file.name}`;
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            await writeFile(tempFilePath, uint8Array);
            
            const options = {
                url: getApiUrl(`/chats/${chatId}/attachments`),
                file_path: tempFilePath,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            };

            try {
                const res: ApiResponse<import("../types/models").ChatAttachment> = await invoke('upload_attachment', {
                    options
                });

                if (isApiError(res)) {
                    throw new Error(res.error.message || 'Upload failed');
                }

                return res;
            } finally {
                try {
                    const { remove } = await import('@tauri-apps/plugin-fs');
                    await remove(tempFilePath);
                } catch (e) {
                    console.warn('Failed to clean up temporary file:', e);
                }
            }
        } else {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(getApiUrl(`/chats/${chatId}/attachments`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });

            const data: ApiResponse<import("../types/models").ChatAttachment> = await res.json();

            if (isApiError(data)) {
                throw new Error(data.error.message || 'Request failed');
            }

            if (!res.ok) {
                throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
            }

            return data;
        }
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'Request failed';
        throw new Error(errorMessage);
    }
}
