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

        if (isTauri) {
            this.listeners.push({ event, callback });
            listen(event, (payload) => callback(payload.payload)).then((unlisten) => {
                const listener = this.listeners.find(l => l.event === event && l.callback === callback);
                if (listener) {
                    listener.unlisten = unlisten;
                }
            });
        } else {
            this.listeners.push({ event, callback });
        }
    }

    public async off(event: string, callback: Function) {
        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            const listener = this.listeners.find(l => l.event === event && l.callback === callback);
            if (listener && listener.unlisten) {
                listener.unlisten();
                this.listeners = this.listeners.filter(l => l !== listener);
            }
        } else {
            this.listeners = this.listeners.filter(l => l.event !== event || l.callback !== callback);
        }
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
    }


    private scheduleAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        setTimeout(() => this.sendAuth(), 1000);
    }

    private sendAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.authToken) return;
        
        const authMessage = {
            type: 'auth',
            data: { token: `Bearer ${this.authToken}` }
        } as const;
        
        this.socket.send(JSON.stringify(authMessage));
    }
}
