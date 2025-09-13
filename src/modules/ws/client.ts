import { getWebSocketUrl } from "../../config";
import { invoke } from "@tauri-apps/api/tauri";
import { listen, UnlistenFn } from '@tauri-apps/api/event';

interface SocketMessage {
    type: string;
    data: Record<string, any>;
    token?: string;
}

const isTauri = '__TAURI__' in window;

type WsMessageEvent = { type: 'message'; data: any };
type WsCloseEvent = { type: 'close'; code: number; reason: string };
type WsErrorEvent = { type: 'error'; error: string };
type WsOpenEvent = { type: 'open' };
type WsEvent = WsMessageEvent | WsCloseEvent | WsErrorEvent | WsOpenEvent;

export class WSClient {
    private authToken: string | null = null;
    private socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private reconnectTimeout: number | null = null;
    private eventHandlers: Array<(event: WsEvent) => void> = [];
    private unlistenTauriEvents: UnlistenFn[] = [];
    private tauriConnectionState: 'connecting' | 'open' | 'closing' | 'closed' = 'connecting';

    constructor(token: string) {
        this.authToken = token;
        this.connect();
    }

    public onEvent(handler: (event: WsEvent) => void): () => void {
        this.eventHandlers.push(handler);
        return () => {
            this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
        };
    }

    private handleNativeMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);
            this.emitEvent({ type: 'message', data });
        } catch (error) {
            this.emitEvent({
                type: 'error',
                error: `Message parse error: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private emitEvent(event: WsEvent) {
        this.eventHandlers.forEach(handler => handler(event));
    }

    private async connect(): Promise<void> {
        this.clearTauriListeners();
        this.tauriConnectionState = 'connecting';
        
        if (isTauri) {
            try {
                await invoke('init_websocket', {
                    url: getWebSocketUrl(),
                    token: this.authToken
                });
                
                const unlistenMessage = await listen<string>('websocket-message', event => {
                    try {
                        const data = JSON.parse(event.payload);
                        this.emitEvent({ type: 'message', data });
                    } catch (error) {
                        this.emitEvent({
                            type: 'error',
                            error: `Invalid message format: ${event.payload}`
                        });
                    }
                });
                
                const unlistenClose = await listen('websocket-close', () => {
                    this.emitEvent({ 
                        type: 'close', 
                        code: 1000, 
                        reason: "Connection closed by server" 
                    });
                    this.tauriConnectionState = 'closed';
                    this.handleReconnect();
                });
                
                const unlistenError = await listen<string>('websocket-error', event => {
                    this.emitEvent({
                        type: 'error',
                        error: `WebSocket error: ${event.payload}`
                    });
                    this.tauriConnectionState = 'closed';
                    this.handleReconnect();
                });
                
                this.unlistenTauriEvents = [unlistenMessage, unlistenClose, unlistenError];
                this.reconnectAttempts = 0;
                this.tauriConnectionState = 'open';
                this.emitEvent({ type: 'open' });
                
                console.log('Tauri WebSocket connected');
                return;
            } catch (error) {
                console.error('Tauri WebSocket connection error:', error);
                this.tauriConnectionState = 'closed';
                this.handleReconnect();
                return;
            }
        }

        try {
            this.socket = new WebSocket(getWebSocketUrl());
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleReconnect();
        }
    }

    private clearTauriListeners() {
        this.unlistenTauriEvents.forEach(unlisten => unlisten());
        this.unlistenTauriEvents = [];
    }

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emitEvent({ type: 'open' });
            this.scheduleAuth();
        };

        this.socket.onmessage = (event) => this.handleNativeMessage(event);

        this.socket.onclose = (event) => {
            this.emitEvent({ 
                type: 'close', 
                code: event.code, 
                reason: event.reason 
            });
            this.handleReconnect();
        };

        this.socket.onerror = (error) => {
            this.emitEvent({
                type: 'error',
                error: `WebSocket error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        };
    }

    private getWebSocketState(): 'connecting' | 'open' | 'closing' | 'closed' {
        if (!this.socket) return 'closed';
        
        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'open';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'closed';
            default: return 'closed';
        }
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

    private handleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emitEvent({
                type: 'error',
                error: 'Max reconnection attempts reached'
            });
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, delay);
    }

    public async send(message: SocketMessage): Promise<void> {
        if (isTauri) {
            try {
                await invoke('send_websocket_message', {
                    message: JSON.stringify(message)
                });
            } catch (error) {
                this.emitEvent({
                    type: 'error',
                    error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
                });
            }
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.emitEvent({
                type: 'error',
                error: 'WebSocket is not connected'
            });
        }
    }

    public async close(code: number = 1000, reason: string = "Normal closure"): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (isTauri) {
            try {
                this.tauriConnectionState = 'closing';
                await invoke('disconnect_websocket');
                this.clearTauriListeners();
                this.tauriConnectionState = 'closed';
                this.emitEvent({ 
                    type: 'close', 
                    code, 
                    reason 
                });
            } catch (error) {
                console.error('Error closing Tauri WebSocket:', error);
            }
            return;
        }
        
        if (this.socket) {
            this.socket.close(code, reason);
            this.socket = null;
        }
    }
    
    public get connectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
        if (isTauri) {
            return this.tauriConnectionState;
        }
        return this.getWebSocketState();
    }
}
