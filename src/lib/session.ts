import { get } from 'svelte/store';
import { loggedIn, refreshTokens, currentUser } from '../stores/auth';
import { typing } from '../stores/typing';
import { WSClient } from './ws-client';
import type { ServerMessage } from '../types/websocket';
import type { Message as ChatMessage } from '../types/models';
import { queryClient } from './query';
import { messageKeys } from '../queries/messages';

const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000;

export class Session {
    private static instance: Session;
    private ws: WSClient | null = null;
    private _profile: any = null;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;
    
    private constructor() {}

    public static getInstance(): Session {
        if (!Session.instance) {
            Session.instance = new Session();
        }
        return Session.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        this.setupListeners();
        await this.checkAuthState();
    }

    public async checkAuthState(): Promise<void> {
        const hasTokens = this.hasValidTokens();
        
        if (!hasTokens) {
            loggedIn.set(false);
            return;
        }

        try {
            await this.initializeAuthenticatedSession();
        } catch (error) {
            console.error('Error initializing authenticated session:', error);
            this.clearSession();
        }
    }

    private async initializeAuthenticatedSession(): Promise<void> {
        if (!this.hasValidTokens()) {
            throw new Error('No valid tokens available');
        }

        if (!this.ws) {
            await this.initializeWebSocket();
        }

        this.setupTokenRefresh();

        if (!get(loggedIn)) {
            loggedIn.set(true);
        }
    }

    private async initializeWebSocket(): Promise<void> {
        const token = localStorage.getItem('access_token');
        if (!token || this.ws) return;

        const ws = new WSClient(token);
        this.ws = ws;

        await ws.on('message', (event: { type: string; data: any }) => {
            const incoming = event.data as ServerMessage;
            this.handleWebSocketMessage(incoming);
        });

        await ws.on('open', () => {
            console.log('[Session] WebSocket connected');
        });

        await ws.on('close', () => {
            if (this.ws === ws) {
                this.ws = null;
            }
        });

        await ws.on('error', () => {
            if (this.ws === ws) {
                this.ws = null;
            }
        });
    }

    private handleWebSocketMessage(message: ServerMessage): void {
        switch (message.type) {
            case 'new_message': {
                if ('data' in message && message.data) {
                    const chatId = message.data.message.chat_id as number;
                    const key = messageKeys.list(chatId);
                    const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
                    const next = [...prev, message.data.message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    queryClient.setQueryData(key, next);
                }
                break;
            }
            case 'message_edited': {
                if ('data' in message && message.data) {
                    const chatId = message.data.message.chat_id as number;
                    const key = messageKeys.list(chatId);
                    const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
                    const next = prev.map(m => m.id === message.data.message.id ? { ...m, ...message.data.message } : m);
                    queryClient.setQueryData(key, next);
                }
                break;
            }
            case 'message_deleted': {
                if ('data' in message && message.data) {
                    const chatId = message.data.chat_id as number;
                    const key = messageKeys.list(chatId);
                    const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
                    const next = prev.map(m => m.id === message.data.message_id ? { ...m, is_deleted: true, deleted_at: new Date().toISOString() } : m);
                    queryClient.setQueryData(key, next);
                }
                break;
            }
            case 'reaction_added': {
                if ('data' in message && message.data) {
                    const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });
                    for (const q of cache) {
                        const key = q.queryKey as ReturnType<typeof messageKeys.list>;
                        const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
                        if (prev.some(m => m.id === message.data.message_id)) {
                            const next = prev.map(m => m.id === message.data.message_id ? { ...m, reactions: [...(m.reactions || []), message.data.reaction] } : m);
                            queryClient.setQueryData(key, next);
                            break;
                        }
                    }
                }
                break;
            }
            case 'reaction_removed': {
                if ('data' in message && message.data) {
                    const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });
                    for (const q of cache) {
                        const key = q.queryKey as ReturnType<typeof messageKeys.list>;
                        const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
                        if (prev.some(m => m.id === message.data.message_id)) {
                            const next = prev.map(m => m.id === message.data.message_id ? { ...m, reactions: (m.reactions || []).filter((r: any) => !(r.user_id === message.data.user_id && r.emoji === message.data.emoji)) } : m);
                            queryClient.setQueryData(key, next);
                            break;
                        }
                    }
                }
                break;
            }
            case 'authenticated': {
                if ('data' in message && message.data) {
                    currentUser.set(message.data.user_id)
                }
            }
        }
        if (message.type === 'user_typing' && 'data' in message && message.data) {
            typing.setTyping(message.data.chat_id, message.data.user_id, message.data.is_typing);
        }
    }

    private setupTokenRefresh(): void {
        this.clearTokenRefresh();
        
        this.tokenRefreshInterval = setInterval(async () => {
            if (this.hasValidTokens()) {
                try {
                    await refreshTokens();
                } catch (error) {
                    console.error('Failed to refresh tokens:', error);
                    this.clearSession();
                }
            }
        }, TOKEN_REFRESH_INTERVAL);
    }

    private setupListeners(): void {
        let previousValue = get(loggedIn);
        
        loggedIn.subscribe((isLoggedIn) => {
            if (previousValue && !isLoggedIn) {
                this.clearSession();
            }

            if (!previousValue && isLoggedIn) {
                if (!this.ws) {
                    this.initializeAuthenticatedSession().catch((e) => {
                        console.error('Failed to initialize session after login:', e);
                    });
                }
            }
            previousValue = isLoggedIn;
        });
    }

    private hasValidTokens(): boolean {
        console.log(localStorage.getItem('access_token'), localStorage.getItem('refresh_token'));
        return !!(localStorage.getItem('access_token') && localStorage.getItem('refresh_token'));
    }

    private clearTokenRefresh(): void {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    public clearSession(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.clearTokenRefresh();

        this._profile = null;
        currentUser.set(null);
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        loggedIn.set(false);
    }

    public async getProfile() {
        return this._profile;
    }

    public isAuthenticated(): boolean {
        return this.hasValidTokens() && get(loggedIn);
    }

    public getWebSocket(): WSClient | null {
        return this.ws;
    }
}

export const session = Session.getInstance();
