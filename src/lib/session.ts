import { get } from 'svelte/store';
import { loggedIn, refreshTokens, currentUser, shouldRefreshTokens } from '$lib/stores/auth';
import { typing } from '$lib/stores/typing';
import { presence } from '$lib/stores/presence';
import { reactions } from '$lib/stores/reactions';
import { WSClient } from '$lib/ws-client';
import type { ServerMessage } from '$lib/types/websocket';
import type { Message as ChatMessage, ChatPreview } from '$lib/types/models';
import { queryClient } from '$lib/query';
import { messageKeys } from '$lib/queries/messages';
import { chatKeys } from '$lib/queries/chats';
import { profileKeys } from '$lib/queries/profile';
import { makeRequest } from '$lib/api';

const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000;

export class Session {
    private static instance: Session;
    private ws: WSClient | null = null;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;
    private loggedInUnsubscribe: (() => void) | null = null;
    
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
        if (!this.hasValidTokens()) {
            loggedIn.set(false);
            return;
        }

        try {
            const needsRefresh = !localStorage.getItem('access_token') || shouldRefreshTokens();
            if (needsRefresh && localStorage.getItem('refresh_token')) {
                await refreshTokens();
            }
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
        const token = this.getAccessToken();
        if (!token) return;

        this.disposeWebSocket();
        
        const ws = new WSClient(token);
        this.ws = ws;

        await ws.on('message', this.handleWebSocketMessage.bind(this));
        await ws.on('open', this.handleWebSocketOpen.bind(this));
        await ws.on('close', this.handleWebSocketClose.bind(this));
        await ws.on('error', this.handleWebSocketError.bind(this));
    }

    private handleWebSocketMessage(event: { type: string; data: any }): void {
        const message = event.data as ServerMessage;
        
        const messageHandlers: Record<string, (data: any) => void> = {
            'new_message': this.handleNewMessage.bind(this),
            'message_edited': this.handleMessageEdited.bind(this),
            'message_deleted': this.handleMessageDeleted.bind(this),
            'reaction_added': this.handleReactionAdded.bind(this),
            'reaction_removed': this.handleReactionRemoved.bind(this),
            'authenticated': this.handleAuthenticated.bind(this),
            'user_typing': this.handleUserTyping.bind(this)
        };

        if (message.type in messageHandlers && 'data' in message && message.data) {
            messageHandlers[message.type](message.data);
        }
    }

    private handleWebSocketOpen(): void {
        console.log('[Session] WebSocket connected');
    }

    private handleWebSocketClose(): void {
        //this.ws = null;
    }

    private handleWebSocketError(): void {
        //this.ws = null;
    }

    private handleNewMessage(data: any): void {
        const chatId = data.message.chat_id as number;
        this.updateMessageList(chatId, prev => [...prev, data.message]);
        this.updateChatListWithMessage(chatId, data.message);
    }

    private handleMessageEdited(data: any): void {
        const chatId = data.message.chat_id as number;
        this.updateMessageList(chatId, prev => 
            prev.map(m => m.id === data.message.id ? { ...m, ...data.message } : m)
        );
        this.updateChatListWithMessage(chatId, data.message);
    }

    private handleMessageDeleted(data: any): void {
        const chatId = data.chat_id as number;
        this.updateMessageList(chatId, prev => 
            prev.filter(m => m.id !== data.message_id)
        );
    }

    private handleReactionAdded(data: any): void {
        const { message_id, reaction } = data;
        if (message_id && reaction) {
            reactions.handleReactionAdded(message_id, reaction);
        }
        this.updateMessageReaction(data.message_id, data, 'add');
    }

    private handleReactionRemoved(data: any): void {
        const { message_id, reaction, user_id, emoji } = data;
        if (message_id) {
            if (reaction?.id) {
                reactions.handleReactionRemoved(message_id, reaction.id);
            } else if (user_id && emoji) {
                reactions.handleReactionRemovedByData(message_id, user_id, emoji);
            }
        }
        this.updateMessageReaction(data.message_id, data, 'remove');
    }

    private handleAuthenticated(data: any): void {
        currentUser.set(data.user_id);
        presence.setOnline(data.user_id);
        this.ws?.send({ type: 'get_online_list', data: {} });
    }

    private handleUserTyping(data: any): void {
        typing.setTyping(data.chat_id, data.user_id, data.is_typing);
    }

    private updateMessageList(chatId: number, updater: (prev: ChatMessage[]) => ChatMessage[]): void {
        const key = messageKeys.list(chatId);
        const prev = queryClient.getQueryData<ChatMessage[]>(key) || [];
        const wasEmpty = prev.length === 0;
        const next = updater(prev).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        queryClient.setQueryData(key, next);
        if (wasEmpty) {
            void queryClient.invalidateQueries({ queryKey: key });
        }
    }

    private updateMessageReaction(messageId: number, reactionData: any, action: 'add' | 'remove'): void {
        const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });
        
        for (const query of cache) {
            const key = query.queryKey as ReturnType<typeof messageKeys.list>;
            const messages = queryClient.getQueryData<ChatMessage[]>(key) || [];
            
            if (messages.some(m => m.id === messageId)) {
                const updatedMessages = messages.map(m => {
                    if (m.id !== messageId) return m;
                    
                    if (action === 'add') {
                        const reaction = reactionData.reaction || reactionData;
                        return { ...m, reactions: [...(m.reactions || []), reaction] };
                    } else {
                        return { 
                            ...m, 
                            reactions: (m.reactions || []).filter((r: any) => 
                                r && !(r.user_id === reactionData.user_id && r.emoji === reactionData.emoji)
                            )
                        };
                    }
                });
                
                queryClient.setQueryData(key, updatedMessages);
                break;
            }
        }
    }

    private updateChatListWithMessage(chatId: number, lastMessage: ChatMessage): void {
        queryClient.setQueryData<ChatPreview[] | undefined>(chatKeys.previews(), (prev) => {
            if (!prev) return prev;

            const chats = [...prev];
            const index = chats.findIndex(c => Number(c.id) === Number(chatId));
            
            if (index === -1) return prev;

            let resolvedLastUser = chats[index].last_user || null;
            const senderId = (lastMessage as any)?.sender_id as number | undefined;
            if (senderId) {
                const cachedProfile = queryClient.getQueryData<any>(profileKeys.detail(senderId));
                if (cachedProfile) {
                    resolvedLastUser = cachedProfile;
                } else {
                    void queryClient
                        .fetchQuery({
                            queryKey: profileKeys.detail(senderId),
                            queryFn: async () => {
                                const res = await makeRequest<any>(`users/${senderId}`, null, true, 'GET');
                                if (!res.data) throw new Error('No profile data in response');
                                return res.data;
                            },
                        })
                        .then((profile) => {
                            queryClient.setQueryData<ChatPreview[] | undefined>(chatKeys.previews(), (current) => {
                                if (!current) return current;
                                const copy = [...current];
                                const idx = copy.findIndex(c => Number(c.id) === Number(chatId));
                                if (idx === -1) return current;
                                copy[idx] = { ...copy[idx], last_user: profile } as ChatPreview;
                                return copy;
                            });
                        })
                        .catch(() => {});
                }
            }

            const updatedChat = {
                ...chats[index],
                last_message: lastMessage,
                last_user: resolvedLastUser,
                updated_at: lastMessage.created_at,
            };

            chats[index] = updatedChat;

            return chats.sort((a, b) => {
                const getDate = (chat: ChatPreview) => 
                    new Date(chat.last_message?.created_at ?? 0).getTime();
                return getDate(b) - getDate(a);
            });
        });
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
        
        this.loggedInUnsubscribe = loggedIn.subscribe((isLoggedIn) => {
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
        return !!(localStorage.getItem('access_token') && localStorage.getItem('refresh_token'));
    }

    private clearTokenRefresh(): void {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    private disposeWebSocket(): void {
        if (this.ws) {
            this.ws.close();
        }
    }

    public clearSession(): void {
        this.disposeWebSocket();
        this.clearTokenRefresh();
        
        if (this.loggedInUnsubscribe) {
            this.loggedInUnsubscribe();
            this.loggedInUnsubscribe = null;
        }

        currentUser.set(null);
        presence.clear?.(); 
        typing.clear?.();
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        queryClient.clear();
        loggedIn.set(false);
    }

    public isAuthenticated(): boolean {
        return this.hasValidTokens() && get(loggedIn);
    }

    public getWebSocket(): WSClient | null {
        return this.ws;
    }

    public getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }
}

export const session = Session.getInstance();

export function getAccessToken(): string | null {
    return session.getAccessToken();
}