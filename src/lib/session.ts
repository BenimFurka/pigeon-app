import { get } from 'svelte/store';
import { loggedIn, refreshTokens, shouldRefreshTokens } from '$lib/stores/auth';
import { typing } from '$lib/stores/typing';
import { presence } from '$lib/stores/presence';
import { reactions } from '$lib/stores/reactions';
import { setReadUpTo, setAllRead } from '$lib/stores/readReceipts';
import { activeChatId } from '$lib/stores/activeChat';
import { wsService, type ConnectionStatus } from '$lib/ws-service';
import type { ServerMessage } from '$lib/types/websocket';
import type { Message as ChatMessage, ChatPreview } from '$lib/types/models';
import { queryClient } from '$lib/query';
import { messageKeys } from '$lib/queries/messages';
import { chatKeys } from '$lib/queries/chats';
import { profileKeys } from '$lib/queries/profile';
import { makeRequest } from '$lib/api';
import { notificationService } from '$lib/notificationService';

const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000;

export class Session {
    private static instance: Session;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;
    private loggedInUnsubscribe: (() => void) | null = null;
    private messageUnsubscribers: (() => void)[] = [];
    private statusUnsubscriber: (() => void) | null = null;

    private constructor() {}

    private getCurrentUserId(): number | null {
        const profileData = queryClient.getQueryData(profileKeys.current()) as any;
        return profileData?.id || null;
    }

    static getInstance(): Session {
        if (!Session.instance) {
            Session.instance = new Session();
        }
        return Session.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.setupAuthListener();
        this.setupStatusListener();
        await this.checkAuthState();
    }

    private setupStatusListener(): void {
        this.statusUnsubscriber = wsService.onStatus((status: ConnectionStatus) => {
            console.log(`[Session] WebSocket status: ${status}`);
            if (status === 'connected') {
                this.registerMessageHandlers();
            }
        });
    }

    private registerMessageHandlers(): void {
        this.clearMessageHandlers();

        const handlers: { [K in ServerMessage['type']]?: (msg: Extract<ServerMessage, { type: K }>) => void } = {
            new_message: (msg) => this.handleNewMessage(msg.data),
            message_edited: (msg) => this.handleMessageEdited(msg.data),
            message_deleted: (msg) => this.handleMessageDeleted(msg.data),
            reaction_added: (msg) => this.handleReactionAdded(msg.data),
            reaction_removed: (msg) => this.handleReactionRemoved(msg.data),
            authenticated: (msg) => this.handleAuthenticated(msg.data),
            user_typing: (msg) => this.handleUserTyping(msg.data),
            message_read: (msg) => this.handleMessageRead(msg.data),
            all_messages_read: (msg) => this.handleAllMessagesRead(msg.data),
            user_online: (msg) => presence.setOnline(msg.data.user_id),
            user_offline: (msg) => presence.setOffline(msg.data.user_id, null),
            online_list: (msg) => presence.setManyOnline(msg.data.users),
            poll_created: (msg) => this.handlePollCreated(msg.data),
            poll_voted: (msg) => this.handlePollVoted(msg.data),
            poll_closed: (msg) => this.handlePollClosed(msg.data),
            poll_updated: (msg) => this.handlePollUpdated(msg.data),
        };

        for (const [type, handler] of Object.entries(handlers)) {
            const unsub = wsService.onMessage(type as ServerMessage['type'], handler as any);
            this.messageUnsubscribers.push(unsub);
        }
    }

    private clearMessageHandlers(): void {
        this.messageUnsubscribers.forEach((unsub) => unsub());
        this.messageUnsubscribers = [];
    }

    async checkAuthState(): Promise<void> {
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

        const token = this.getAccessToken();
        if (token) {
            await wsService.connect(token);
        }

        this.setupTokenRefresh();
        loggedIn.set(true);
    }

    private handleNewMessage(data: { message: ChatMessage }): void {
        const chatId = data.message.chat_id;
        const serverMsg = data.message as ChatMessage & { status?: string };
        const myId = this.getCurrentUserId();

        if (serverMsg.media && serverMsg.media.length > 0) {
            const pollMedia = serverMsg.media.find(m => m.type === 'Poll');
            if (pollMedia) {
                import('$lib/queries/polls').then(({ storePollFromMessage }) => {
                    storePollFromMessage(serverMsg, myId);
                });
            }
        }

        this.updateMessageList(chatId, (prev) => {
            const optimistic = prev.find(
                (m) =>
                    (m as any).status === 'sending' &&
                    m.sender_id === myId &&
                    m.content === serverMsg.content &&
                    (m.reply_to_message_id ?? null) === (serverMsg.reply_to_message_id ?? null) &&
                    this.mediaMatches((m as any).media, serverMsg.media)
            );
            if (optimistic) {
                const rest = prev.filter((m) => m !== optimistic);
                const merged = { ...serverMsg, status: 'sent' as const };
                return [...rest, merged].sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            }
            return [...prev, serverMsg].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
        this.updateChatListWithMessage(chatId, serverMsg);
        if (myId != null && serverMsg.sender_id !== myId) {
            this.showNotificationIfNeeded(chatId, serverMsg);
        }
    }

    private mediaMatches(optimisticMedia: any[] | null | undefined, serverMedia: any[] | null | undefined): boolean {
        const optEmpty = !optimisticMedia || optimisticMedia.length === 0;
        const srvEmpty = !serverMedia || serverMedia.length === 0;

        if (optEmpty && srvEmpty) return true;
        if (optEmpty || srvEmpty) return false;
        if (optimisticMedia!.length !== serverMedia!.length) return false;
        
        for (let i = 0; i < optimisticMedia!.length; i++) {
            const opt = optimisticMedia![i];
            const srv = serverMedia![i];
            if (opt.type !== srv.type) return false;
            if (opt.type === 'Gif' && opt.preview_url !== srv.preview_url) return false;
        }
        return true;
    }

    private handleMessageEdited(data: { message: ChatMessage }): void {
        const chatId = data.message.chat_id;
        const myId = this.getCurrentUserId();

        if (data.message.media && data.message.media.length > 0) {
            const pollMedia = data.message.media.find(m => m.type === 'Poll');
            if (pollMedia) {
                import('$lib/queries/polls').then(({ storePollFromMessage }) => {
                    storePollFromMessage(data.message, myId);
                });
            }
        }

        this.updateMessageList(chatId, (prev) =>
            prev.map((m) => (m.id === data.message.id ? { ...m, ...data.message } : m))
        );
        this.updateChatListWithMessage(chatId, data.message);
    }

    private handleMessageDeleted(data: { message_id: number; chat_id: number }): void {
        this.updateMessageList(data.chat_id, (prev) => prev.filter((m) => m.id !== data.message_id));
    }

    private handleReactionAdded(data: { message_id: number; reaction: any }): void {
        if (data.message_id && data.reaction) {
            reactions.handleReactionAdded(data.message_id, data.reaction);
        }
        this.updateMessageReaction(data.message_id, data, 'add');
    }

    private handleReactionRemoved(data: { message_id: number; user_id: number; emoji: string; reaction?: { id: number } }): void {
        if (data.message_id) {
            if (data.reaction?.id) {
                reactions.handleReactionRemoved(data.message_id, data.reaction.id);
            } else if (data.user_id && data.emoji) {
                reactions.handleReactionRemovedByData(data.message_id, data.user_id, data.emoji);
            }
        }
        this.updateMessageReaction(data.message_id, data, 'remove');
    }

    private handleAuthenticated(data: { user_id: number }): void {
        presence.setOnline(data.user_id);
        wsService.send({ type: 'get_online_list', data: {} });
    }

    private handleUserTyping(data: { chat_id: number; user_id: number; is_typing: boolean }): void {
        typing.setTyping(data.chat_id, data.user_id, data.is_typing);
    }

    private handleMessageRead(data: { chat_id: number; message_id: number; reader_id: number }): void {
        const me = this.getCurrentUserId();
        if (me != null && data.reader_id !== me) {
            setReadUpTo(data.chat_id, data.message_id);
        }
    }

    private handleAllMessagesRead(data: { chat_id: number; user_id: number }): void {
        const me = this.getCurrentUserId();
        if (me != null && data.user_id !== me) {
            setAllRead(data.chat_id);
        }
    }

    private handlePollCreated(data: { poll: { message_id: number | null }; options: any[] }): void {
        import('$lib/stores/polls').then(({ polls }) => {
            if (data.poll?.message_id) {
                polls.handlePollCreated(data.poll.message_id, {
                    poll: data.poll as any,
                    options: data.options
                });
            }
        });
    }

    private handlePollVoted(data: { poll_id: number; voter_id: number; option_ids: number[] }): void {
        import('$lib/stores/polls').then(({ polls }) => {
            polls.handlePollVoted(data.poll_id, data.voter_id, data.option_ids);
        });

        const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });
        for (const query of cache) {
            const key = query.queryKey as ReturnType<typeof messageKeys.list>;
            const messages = queryClient.getQueryData<ChatMessage[]>(key);
            if (!messages) continue;

            const message = messages.find(m => m.id === data.poll_id);
            if (message) {
                const chatId = message.chat_id;
                const pollMedia = message.media?.find((m: any) => m.type === 'Poll');
                if (pollMedia) {
                    this.updatePollInMessages(chatId, data.poll_id, {
                        options: pollMedia.options.map((opt: any) => ({
                            ...opt,
                            votes_count: data.option_ids.includes(opt.id) ? (opt.votes_count || 0) + 1 : opt.votes_count
                        }))
                    });
                }
                break;
            }
        }
    }

    private handlePollClosed(data: { message_id: number }): void {
        import('$lib/stores/polls').then(({ polls }) => {
            polls.handlePollClosed(data.message_id);
        });

        const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });
        for (const query of cache) {
            const key = query.queryKey as ReturnType<typeof messageKeys.list>;
            const messages = queryClient.getQueryData<ChatMessage[]>(key);
            if (!messages) continue;

            const message = messages.find(m => m.id === data.message_id);
            if (message) {
                const chatId = message.chat_id;
                const pollMedia = message.media?.find((m: any) => m.type === 'Poll');
                if (pollMedia) {
                    this.updatePollInMessages(chatId, data.message_id, {
                        is_closed: true,
                        options: pollMedia.options
                    });
                }
                break;
            }
        }
    }

    private handlePollUpdated(data: { chat_id: number; poll: any; options: any[]; has_voted: boolean; voter_id: number; user_voted_options: number[] }): void {
        import('$lib/stores/polls').then(({ polls }) => {
            polls.handlePollUpdated(data.poll, data.options, data.has_voted, data.voter_id, data.user_voted_options);
        });

        this.updatePollInMessages(data.chat_id, data.poll.message_id, {
            has_voted: data.has_voted,
            user_voted_options: data.user_voted_options,
            options: data.options,
            is_closed: data.poll.is_closed
        });
    }

    private updatePollInMessages(chatId: number, messageId: number, pollUpdates: { has_voted?: boolean; user_voted_options?: number[]; options?: any[]; is_closed?: boolean }): void {
        const key = messageKeys.list(chatId);
        const messages = queryClient.getQueryData<ChatMessage[]>(key);

        if (!messages) return;

        const updatedMessages = messages.map((msg) => {
            if (msg.id !== messageId || !msg.media) return msg;

            const pollMedia = msg.media.find((m: any) => m.type === 'Poll');
            if (!pollMedia) return msg;

            return {
                ...msg,
                media: msg.media.map((m: any) => {
                    if (m.type !== 'Poll') return m;

                    const updated = { ...m };
                    if (pollUpdates.has_voted !== undefined) updated.has_voted = pollUpdates.has_voted;
                    if (pollUpdates.user_voted_options) updated.user_voted_options = pollUpdates.user_voted_options;
                    if (pollUpdates.options) updated.options = pollUpdates.options;
                    if (pollUpdates.is_closed !== undefined) updated.is_closed = pollUpdates.is_closed;

                    return updated;
                })
            };
        });

        queryClient.setQueryData(key, updatedMessages);
    }

    private async showNotificationIfNeeded(chatId: number, message: ChatMessage): Promise<void> {
        try {
            const chats = queryClient.getQueryData<ChatPreview[]>(chatKeys.previews()) || [];
            const chat = chats.find(c => Number(c.id) === Number(chatId));
            
            if (!chat) {
                return;
            }

            const activeChat = get(activeChatId);
            if (Number(activeChat) === Number(chatId)) {
                return;
            }

            let sender = chat.last_user;
            if (!sender && message.sender_id) {
                const cachedProfile = queryClient.getQueryData<any>(profileKeys.detail(message.sender_id));
                if (cachedProfile) {
                    sender = cachedProfile;
                }
            }

            await notificationService.showNotification(chat, sender, message);
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }

    private updateMessageList(
        chatId: number,
        updater: (prev: ChatMessage[]) => ChatMessage[]
    ): void {
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

    private updateMessageReaction(
        messageId: number,
        reactionData: any,
        action: 'add' | 'remove'
    ): void {
        const cache = queryClient.getQueryCache().findAll({ queryKey: messageKeys.all });

        for (const query of cache) {
            const key = query.queryKey as ReturnType<typeof messageKeys.list>;
            const messages = queryClient.getQueryData<ChatMessage[]>(key) || [];

            if (messages.some((m) => m.id === messageId)) {
                const updatedMessages = messages.map((m) => {
                    if (m.id !== messageId) return m;

                    if (action === 'add') {
                        const reaction = reactionData.reaction || reactionData;
                        return { ...m, reactions: [...(m.reactions || []), reaction] };
                    } else {
                        return {
                            ...m,
                            reactions: (m.reactions || []).filter(
                                (r: any) =>
                                    r &&
                                    !(
                                        r.user_id === reactionData.user_id &&
                                        r.emoji === reactionData.emoji
                                    )
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
            const index = chats.findIndex((c) => Number(c.id) === Number(chatId));
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
                            }
                        })
                        .then((profile) => {
                            queryClient.setQueryData<ChatPreview[] | undefined>(
                                chatKeys.previews(),
                                (current) => {
                                    if (!current) return current;
                                    const copy = [...current];
                                    const idx = copy.findIndex((c) => Number(c.id) === Number(chatId));
                                    if (idx === -1) return current;
                                    copy[idx] = { ...copy[idx], last_user: profile } as ChatPreview;
                                    return copy;
                                }
                            );
                        })
                        .catch(() => {});
                }
            }

            const me = this.getCurrentUserId();
            const isFromOther = me != null && (lastMessage as any)?.sender_id !== me;
            const isActiveChat = Number(chatId) === Number(get(activeChatId));
            const prevUnread = typeof chats[index].unread_count === 'number' ? chats[index].unread_count : 0;
            const newUnread = isFromOther && !isActiveChat ? prevUnread + 1 : isActiveChat ? 0 : prevUnread;

            const updatedChat = {
                ...chats[index],
                last_message: lastMessage,
                last_user: resolvedLastUser,
                updated_at: lastMessage.created_at,
                unread_count: newUnread,
                ...(isActiveChat
                    ? { last_read_message_id: (lastMessage as any)?.id ?? chats[index].last_read_message_id }
                    : {})
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

    private setupAuthListener(): void {
        let previousValue = get(loggedIn);
        this.loggedInUnsubscribe = loggedIn.subscribe((isLoggedIn) => {
            if (previousValue && !isLoggedIn) {
                this.clearSession();
            }
            if (!previousValue && isLoggedIn) {
                this.initializeAuthenticatedSession().catch(console.error);
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

    clearSession(): void {
        wsService.disconnect();
        this.clearTokenRefresh();
        this.clearMessageHandlers();

        presence.clear?.();
        typing.clear?.();

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        queryClient.clear();
        loggedIn.set(false);
    }

    isAuthenticated(): boolean {
        return this.hasValidTokens() && get(loggedIn);
    }

    getAccessToken(): string | null {
        return localStorage.getItem('access_token');
    }

    addOptimisticMessage(
        chatId: number,
        content: string,
        options?: { reply_to?: number; attachment_ids?: number[]; media?: any[] }
    ): void {
        const myId = this.getCurrentUserId();
        if (myId == null) return;
        const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic: ChatMessage = {
            id: -Math.abs(tempId.slice(-8).split('').reduce((a, c) => a + c.charCodeAt(0), 0)),
            chat_id: chatId,
            sender_id: myId,
            reply_to_message_id: options?.reply_to ?? null,
            content,
            is_edited: false,
            created_at: new Date().toISOString(),
            edited_at: null,
            attachments: options?.attachment_ids?.length ? [] : null,
            reactions: null,
            status: 'sending',
            clientId: tempId
        } as any;
        
        if (options?.media && options.media.length > 0) {
            (optimistic as any).media = options.media;
        }
        this.updateMessageList(chatId, (prev) =>
            [...prev, optimistic].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
        );
    }
}

export const session = Session.getInstance();

export function getAccessToken(): string | null {
    return session.getAccessToken();
}