import type { ApiResponse, ApiError } from "../types/models";
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
            'Content-Type': 'application/json'
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
