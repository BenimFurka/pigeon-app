import { getWebSocketUrl } from "../config";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getIsTauriEnvironment } from "./tauri-env";

interface SocketMessage {
    type: string;
    data: Record<string, any>;
    token?: string;
}

type WsMessageEvent = { type: 'message'; data: any };
type WsCloseEvent = { type: 'close'; code: number; reason: string };
type WsErrorEvent = { type: 'error'; error: string };
type WsOpenEvent = { type: 'open' };
type WsEvent = WsMessageEvent | WsCloseEvent | WsErrorEvent | WsOpenEvent;

export class WSClient {
    private authToken: string | null = null;
    private socket: WebSocket | null = null;
    private connectionState: 'disconnected' | 'connecting' | 'connected' | 'closing' | 'closed' = 'disconnected';
    private listeners: Array<{ event: string; callback: Function; unlisten?: UnlistenFn }> = [];

    constructor(token?: string) {
        this.authToken = token || null;
        this.initialize();
    }

    private async initialize() {
        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            try {
                this.connectionState = 'connecting';
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('init_websocket', {
                    url: getWebSocketUrl(),
                    token: this.authToken
                });
                this.connectionState = 'connected';
                this.emitEvent({ type: 'open' });
            } catch (error) {
                console.error('Error initializing Tauri WebSocket:', error);
                this.connectionState = 'disconnected';
                this.emitEvent({ type: 'error', error: String(error) });
            }
        } else {
            this.connectionState = 'connecting';
            this.connectWebSocket();
        }
    }

    private connectWebSocket() {
        if (this.socket) {
            this.socket.close();
        }

        this.socket = new WebSocket(getWebSocketUrl());
        this.socket.onopen = () => {
            this.connectionState = 'connected';
            this.emitEvent({ type: 'open' });
            this.scheduleAuth();
        };
        this.socket.onmessage = (event) => {
            this.emitEvent({ type: 'message', data: JSON.parse(event.data) });
        };
        this.socket.onclose = (event) => {
            this.connectionState = 'closed';
            this.emitEvent({ type: 'close', code: event.code, reason: event.reason });
        };
        this.socket.onerror = (event) => {
            this.emitEvent({ type: 'error', error: 'WebSocket error' });
        };
    }

    public async send(message: any) {
        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('send_websocket_message', {
                    message: JSON.stringify(message)
                });
            } catch (error) {
                console.error('Error sending Tauri WebSocket message:', error);
            }
        } else {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            }
        }
    }

    public async close() {
        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            try {
                this.connectionState = 'closing';
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('disconnect_websocket');
                this.clearTauriListeners();
                this.connectionState = 'closed';
                this.emitEvent({ type: 'close', code: 1000, reason: 'Closed by user' });
            } catch (error) {
                console.error('Error closing Tauri WebSocket:', error);
            }
            return;
        }

        if (this.socket) {
            this.socket.close();
        }
    }

    public async on(event: string, callback: Function) {
        const isTauri = await getIsTauriEnvironment();

        const listener = { event, callback } as { event: string; callback: Function; unlisten?: UnlistenFn };
        this.listeners.push(listener);

        if (isTauri) {
            const tauriEvent = this.mapTauriEvent(event);
            if (!tauriEvent) {
                return;
            }

            const unlisten = await listen(tauriEvent, (payload) => {
                const normalized = this.normalizeTauriEvent(event, payload.payload);
                if (!normalized) {
                    return;
                }

                if (normalized.type === 'close') {
                    this.connectionState = 'closed';
                } else if (normalized.type === 'error') {
                    this.connectionState = 'disconnected';
                }

                callback(normalized);
            });

            const stored = this.listeners.find(l => l.event === event && l.callback === callback);
            if (stored) {
                stored.unlisten = unlisten;
            }
            return;
        }
    }

    public async off(event: string, callback: Function) {
        const isTauri = await getIsTauriEnvironment();

        const listener = this.listeners.find(l => l.event === event && l.callback === callback);

        if (listener && listener.unlisten) {
            listener.unlisten();
        }

        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private emitEvent(event: WsEvent) {
        this.listeners.forEach(listener => {
            if (listener.event === event.type) {
                listener.callback(event);
            }
        });
    }

    private clearTauriListeners() {
        this.listeners.forEach(listener => {
            if (listener.unlisten) {
                listener.unlisten();
            }
        });
        this.listeners = [];
        this.connectionState = 'disconnected';
    }


    private scheduleAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        setTimeout(() => this.sendAuth(), 1000);
    }

    private sendAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.authToken) return;
        
        const authMessage: import('../types/websocket').AuthenticateMessage = {
            type: 'authenticate',
            data: {
                token: `Bearer ${this.authToken}`
            }
        };
        
        this.socket.send(JSON.stringify(authMessage));
    }

    private mapTauriEvent(event: string): string | null {
        switch (event) {
            case 'message':
                return 'websocket-message';
            case 'close':
                return 'websocket-close';
            case 'error':
                return 'websocket-error';
            default:
                return null;
        }
    }

    private normalizeTauriEvent(event: string, payload: any): WsEvent | null {
        switch (event) {
            case 'message':
                return { type: 'message', data: payload };
            case 'close': {
                const code = typeof payload?.code === 'number' ? payload.code : 1000;
                const reason = typeof payload?.reason === 'string' ? payload.reason : '';
                return { type: 'close', code, reason };
            }
            case 'error':
                return { type: 'error', error: String(payload ?? 'Unknown error') };
            default:
                return null;
        }
    }
}
