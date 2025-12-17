import { getWebSocketUrl } from "../config";
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getIsTauriEnvironment } from "./tauri-env";
import { presence } from '../stores/presence';
import { queryClient } from './query';
import type { 
    OnlineListMessage, 
    UserOfflineMessage, 
    UserOnlineMessage, 
    AuthenticateMessage
} from '../types/websocket';
import type { Chat, ChatMember } from "../types/models";

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'closing' | 'closed';

type WsMessageEvent = { type: 'message'; data: any };
type WsCloseEvent = { type: 'close'; code: number; reason: string };
type WsErrorEvent = { type: 'error'; error: string };
type WsOpenEvent = { type: 'open' };
type WsEvent = WsMessageEvent | WsCloseEvent | WsErrorEvent | WsOpenEvent;

interface EventListener {
    event: string;
    callback: Function;
    unlisten?: UnlistenFn;
}

const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
const ONLINE_STATUS_INTERVAL = 5 * 60 * 1000;
const AUTH_DELAY = 500;

export class WSClient {
    private authToken: string | null = null;
    private socket: WebSocket | null = null;
    private connectionState: ConnectionState = 'disconnected';
    private listeners: EventListener[] = [];
    private shouldReconnect = true;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private onlineStatusInterval: ReturnType<typeof setInterval> | null = null;
    private handlersRegistered = false;

    constructor(token?: string) {
        this.authToken = token || null;
        this.registerCoreHandlers();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        const isTauri = await getIsTauriEnvironment();
        this.connectionState = 'connecting';

        if (isTauri) {
            await this.initializeTauriWebSocket();
        } else {
            this.connectWebSocket();
        }
    }

    private async initializeTauriWebSocket(): Promise<void> {
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
    }

    private connectWebSocket(): void {
        this.disconnectSocket();
        
        this.socket = new WebSocket(getWebSocketUrl());
        
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }

    private handleOpen(): void {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.emitEvent({ type: 'open' });
        this.scheduleAuth();
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const parsed = JSON.parse(event.data);
            this.emitEvent({ type: 'message', data: parsed });
            
            if (parsed?.type) {
                this.emitEvent({ type: parsed.type, data: parsed.data });
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    private handleClose(event: CloseEvent): void {
        this.connectionState = 'closed';
        this.emitEvent({ 
            type: 'close', 
            code: event.code, 
            reason: event.reason 
        });
        this.scheduleReconnect();
    }

    private handleError(_event: Event): void {
        this.emitEvent({ type: 'error', error: 'WebSocket error' });
        this.scheduleReconnect();
    }

    public async send(message: unknown): Promise<void> {
        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            await this.sendTauriMessage(message);
        } else {
            this.sendBrowserMessage(message);
        }
    }

    private async sendTauriMessage(message: unknown): Promise<void> {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('send_websocket_message', {
                message: JSON.stringify(message)
            });
        } catch (error) {
            console.error('Error sending Tauri WebSocket message:', error);
        }
    }

    private sendBrowserMessage(message: unknown): void {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    public async close(): Promise<void> {
        this.shouldReconnect = false;
        this.connectionState = 'closing';

        const isTauri = await getIsTauriEnvironment();

        if (isTauri) {
            await this.closeTauriWebSocket();
        } else {
            this.closeBrowserWebSocket();
        }
    }

    private async closeTauriWebSocket(): Promise<void> {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('disconnect_websocket');
        } catch (error) {
            console.error('Error closing Tauri WebSocket:', error);
        } finally {
            this.cleanup();
            this.emitEvent({ type: 'close', code: 1000, reason: 'Closed by user' });
        }
    }

    private closeBrowserWebSocket(): void {
        this.socket?.close();
        this.cleanup();
    }

    private cleanup(): void {
        this.clearAllTimers();
        this.clearAllListeners();
        this.connectionState = 'closed';
    }

    public async on(event: string, callback: Function): Promise<void> {
        const isTauri = await getIsTauriEnvironment();
        
        const listener: EventListener = { event, callback };
        
        if (this.isListenerDuplicate(listener)) {
            return;
        }
        
        this.listeners.push(listener);

        if (isTauri) {
            await this.setupTauriListener(listener);
        }
    }

    private isListenerDuplicate(newListener: EventListener): boolean {
        return this.listeners.some(
            l => l.event === newListener.event && l.callback === newListener.callback
        );
    }

    private async setupTauriListener(listener: EventListener): Promise<void> {
        const tauriEvent = this.mapTauriEvent(listener.event);
        if (!tauriEvent) return;

        const unlisten = await listen(tauriEvent, (payload) => {
            const normalized = this.normalizeTauriEvent(listener.event, payload.payload);
            if (!normalized) return;

            if (normalized.type === 'close') {
                this.connectionState = 'closed';
            } else if (normalized.type === 'error') {
                this.connectionState = 'disconnected';
            }

            listener.callback(normalized);

            if (normalized.type === 'message') {
                this.processTypedMessage(normalized.data);
            }
        });

        listener.unlisten = unlisten;
    }

    private processTypedMessage(data: any): void {
        if (data?.type) {
            this.emitEvent({ type: data.type, data: data.data });
        }
    }

    public async off(event: string, callback: Function): Promise<void> {
        const index = this.listeners.findIndex(
            l => l.event === event && l.callback === callback
        );

        if (index !== -1) {
            const listener = this.listeners[index];
            listener.unlisten?.();
            this.listeners.splice(index, 1);
        }
    }

    private emitEvent(event: WsEvent): void {
        this.listeners.forEach(listener => {
            if (listener.event === event.type) {
                listener.callback(event);
            }
        });
    }

    private clearAllListeners(): void {
        this.listeners.forEach(listener => {
            listener.unlisten?.();
        });
        this.listeners = [];
    }

    private registerCoreHandlers(): void {
        if (this.handlersRegistered) return;
        this.handlersRegistered = true;

        this.on('authenticated', this.handleAuthenticated.bind(this));
        this.on('user_online', this.handleUserOnline.bind(this));
        this.on('user_offline', this.handleUserOffline.bind(this));
        this.on('online_list', this.handleOnlineList.bind(this));
    }

    private handleAuthenticated(): void {
        this.requestOnlineStatus();
        this.onlineStatusInterval = setInterval(
            () => this.requestOnlineStatus(), 
            ONLINE_STATUS_INTERVAL
        );
    }

    private handleUserOnline(event: WsMessageEvent): void {
        const data = event.data as UserOnlineMessage['data'];
        if (data.user_id) {
            presence.setOnline(data.user_id);
        }
    }

    private handleUserOffline(event: WsMessageEvent): void {
        const data = event.data as UserOfflineMessage['data'];
        if (data.user_id) {
            presence.setOffline(data.user_id, null);
        }
    }

    private handleOnlineList(event: WsMessageEvent): void {
        const data = event.data as OnlineListMessage['data'];
        if (Array.isArray(data.list)) {
            presence.setManyOnline(data.list);
        }
    }

    private scheduleAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        setTimeout(() => this.sendAuth(), AUTH_DELAY);
    }

    private async requestOnlineStatus(): Promise<void> {
        try {
            const userIds = this.getChatUserIds();
            if (userIds.size === 0) return;

            await this.send({
                type: 'get_online_status',
                data: {
                    user_ids: Array.from(userIds)
                }
            });
        } catch (error) {
            console.error('Error requesting online status:', error);
        }
    }

    private getChatUserIds(): Set<number> {
        const chatData = queryClient.getQueryData<Chat>(['chats']);
        if (!chatData) return new Set();

        const userIds = new Set<number>();
        
        chatData.members.forEach((member: ChatMember) => {
            if (member.user_id) {
                userIds.add(member.user_id);
            }
        });

        return userIds;
    }

    private sendAuth(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.authToken) return;
        
        const authMessage: AuthenticateMessage = {
            type: 'authenticate',
            data: {
                token: `Bearer ${this.authToken}`
            }
        };
        
        this.socket.send(JSON.stringify(authMessage));
        this.send({ type: 'get_online_list', data: {} });
    }

    private scheduleReconnect(): void {
        if (!this.shouldReconnect || this.reconnectTimer) return;

        const delay = Math.min(
            30000, 
            RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts)
        );
        
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.warn('Max reconnection attempts reached');
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.initialize();
        }, delay);
    }

    private clearAllTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.onlineStatusInterval) {
            clearInterval(this.onlineStatusInterval);
            this.onlineStatusInterval = null;
        }
    }

    private disconnectSocket(): void {
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            
            this.socket = null;
        }
    }

    private mapTauriEvent(event: string): string | null {
        const eventMap: Record<string, string> = {
            'message': 'websocket-message',
            'close': 'websocket-close',
            'error': 'websocket-error'
        };
        
        return eventMap[event] || null;
    }

    private normalizeTauriEvent(event: string, payload: any): WsEvent | null {
        switch (event) {
            case 'message':
                try {
                    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
                    return { type: 'message', data };
                } catch {
                    return { type: 'message', data: payload };
                }
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