import { ApiResponse } from "../types/api";
import { getApiUrl } from "../config";
import { invoke } from "@tauri-apps/api/tauri";

export async function makeRequest(endpoint: string, body?: any, includeAuth = false, method?: string): Promise<ApiResponse> {
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
                url: url,
                body: body,
                headers: headers,
                method: method || 'POST'
            }

            const res: ApiResponse | string = await invoke('make_request', { 
                options
            });

            if (typeof res === "string") { 
                throw new Error(res);
            }
            
            if (res.success === true) return res; 
            else { 
                throw new Error(res.message);
            }
            
        } else {
            const res = await fetch(getApiUrl(endpoint), { 
                method: method || 'POST', 
                headers: headers,
                body: body
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Request failed');
            }

            return await res.json() as ApiResponse;
        }
    } catch (err) {
        console.error(err);
        throw new Error(`Request failed: ${err}`);
    }
}
