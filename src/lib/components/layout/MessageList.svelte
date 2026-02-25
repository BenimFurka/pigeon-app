<script lang="ts">
    import Message from '$lib/components/shared/Message.svelte';
    import { fetchMessages, messageKeys, useMessages } from '$lib/queries/messages';
    import { useChat } from '$lib/queries/chats';
    import { currentUser } from '$lib/stores/auth';
    import type { Message as MessageType, ChatMember } from '$lib/types/models';
    import { queryClient } from '$lib/query';
    import { formatDateHeader } from '$lib/datetime';
    import { ChevronDown } from 'lucide-svelte';
    import { ChatType } from '$lib/types/models';
    import { session } from '$lib/session';
    import { _, format } from 'svelte-i18n';
    
    // Props
    export let chatContext: {
        selectedChat: any;
        chat: any;
        myMembership: ChatMember | undefined;
        replyToMessage: MessageType | null;
        onReply: (event: CustomEvent) => void;
        updateChatUnreadCount: (chatId: number, unreadCount?: number, lastReadMessageId?: number) => void;
    };
    

    // Constants
    const PAGE_SIZE = 50;
    const SCROLL_TOP_THRESHOLD_PX = 120;
    const MARK_READ_THROTTLE_MS = 400;

    // State
    let messageList: MessageType[] = [];
    let messagesContainer: HTMLDivElement;
    let replyToMap: Map<number, MessageType> = new Map();
    const loadedChats = new Set<number>();
    let markReadThrottle: ReturnType<typeof setTimeout> | null = null;
    let lastMarkReadMessageId = 0;
    let isLoadingOlder = false;
    let hasMoreOlder = true;
    let didInitialScroll = false;
    let lastChatId: number | null = null;
    let lastMessageCount = 0;
    let isUserAtBottom = true;

    // Queries
    $: messagesQuery = chatId ? useMessages(chatId, { enabled: !!chatId, params: { limit: PAGE_SIZE } }) : null;
    $: chatQuery = chatId && !chatType ? useChat(chatId, { enabled: !!chatId && !chatType }) : null;

    // Computed values
    $: chatId = chatContext.selectedChat ? (chatContext.selectedChat.id > 0 ? Number(chatContext.selectedChat.id) : null) : null;
    $: lastReadMessageId = chatContext.selectedChat?.last_read_message_id ?? null;
    $: myMembership = chatContext.myMembership;
    $: chatType = chatContext.chat?.chat_type || chatContext.selectedChat?.chat_type || null;
    $: effectiveChatType = chatType || $chatQuery?.data?.chat_type || null;
    $: groupedMessages = messageList.reduce((groups, message, index) => {
        const messageDate = new Date(message.created_at).toDateString();
        const prevMessage = index > 0 ? messageList[index - 1] : null;
        
        const isNewDay = !prevMessage || new Date(prevMessage.created_at).toDateString() !== messageDate;
        
        if (isNewDay) {
            groups.push({
                dateHeader: formatDateHeader(message.created_at, $format),
                messages: [message]
            });
        } else {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup) {
                lastGroup.messages.push(message);
            }
        }
        
        return groups;
    }, [] as { dateHeader: string; messages: MessageType[] }[]);
    $: firstUnreadMessageId = lastReadMessageId != null
        ? (messageList.find((m) => m.id > 0 && m.id > lastReadMessageId! && m.sender_id !== $currentUser)?.id ?? null)
        : null;

    // Reactive statements
    $: if (chatId && messagesQuery) {
        const data = $messagesQuery?.data || [];
        messageList = data;

        if (chatId !== lastChatId) {
            lastChatId = chatId;
            didInitialScroll = false;
            hasMoreOlder = true;
            replyToMap = new Map();
            lastMessageCount = 0;
            lastMarkReadMessageId = 0;
        }

        if (messageList.length > lastMessageCount && lastMessageCount > 0 && isUserAtBottom) {
            setTimeout(() => scrollToBottom(), 0);
        }
        
        lastMessageCount = messageList.length;

        messageList.forEach(msg => {
            if (msg.reply_to_message_id && !replyToMap.has(msg.reply_to_message_id)) {
                const replyTo = messageList.find(m => m.id === msg.reply_to_message_id);
                if (replyTo) {
                    replyToMap.set(msg.reply_to_message_id, replyTo);
                }
            }
        });

        if (!didInitialScroll && messageList.length > 0 && messageList.length < PAGE_SIZE && !($messagesQuery?.isLoading)) {
            hasMoreOlder = false;
        }

        if (!didInitialScroll && messageList.length > 0 && !($messagesQuery?.isLoading)) {
            didInitialScroll = true;
            const firstUnreadId = getFirstUnreadMessageId();
            setTimeout(() => scrollToInitialPosition(firstUnreadId), 0);
            const lastId = messageList[messageList.length - 1]?.id;
            if (chatId && typeof lastId === 'number' && lastId > 0) {
                setTimeout(() => sendMarkAsRead(lastId), 300);
            }
        }

        if (chatId && !loadedChats.has(chatId) && !($messagesQuery?.isLoading)) {
            loadedChats.add(chatId);
            void (async () => {
                try {
                    await $messagesQuery?.refetch?.();
                } catch (e) { }
            })();
        }
    }


    // Utility functions
    function isMobileDevice(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function getFirstUnreadMessageId(): number | null {
        if (lastReadMessageId == null) return null;
        const first = messageList.find((m) => m.id > 0 && m.id > lastReadMessageId!);
        return first?.id ?? null;
    }

    function scrollToInitialPosition(firstUnreadId: number | null) {
        if (!messagesContainer) return;
        if (firstUnreadId != null) {
            setTimeout(() => {
                const el = messagesContainer.querySelector(`[data-message-id="${firstUnreadId}"]`);
                if (el) {
                    const containerRect = messagesContainer.getBoundingClientRect();
                    const elementRect = (el as HTMLElement).getBoundingClientRect();
                    const relativeTop = elementRect.top - containerRect.top + messagesContainer.scrollTop;
                    messagesContainer.scrollTop = relativeTop - 50;
                } else {
                    scrollToBottom();
                }
            }, 50);
        } else {
            scrollToBottom();
        }
    }

    function isAtBottom(): boolean {
        if (!messagesContainer) return true;
        const threshold = 50;
        return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight <= threshold;
    }

    function mergeMessages(prev: MessageType[], incoming: MessageType[]): MessageType[] {
        const byId = new Map<number, MessageType>();
        for (const m of prev) byId.set(m.id, m);
        for (const m of incoming) byId.set(m.id, m);
        return Array.from(byId.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }

    function getEmptyStateText() {
        switch (effectiveChatType) {
            case ChatType.DM:
                return {
                    title: $_('message_list.no_messages'),
                    hint: $_('message_list.start_conversation')
                };
            case ChatType.GROUP:
                return {
                    title: $_('message_list.no_group_messages'),
                    hint: $_('message_list.start_group_dialog')
                };
            case ChatType.CHANNEL:
                return {
                    title: $_('message_list.no_posts'),
                    hint: $_('message_list.subscribe_for_updates')
                };
            default:
                return {
                    title: $_('message_list.no_messages'),
                    hint: $_('message_list.start_conversation')
                };
        }
    }

    // Event handlers
    async function loadOlderMessages() {
        if (!chatId) return;
        if (isLoadingOlder) return;
        if (!hasMoreOlder) return;
        if (messageList.length === 0) return;

        const oldestId = messageList[0]?.id;
        if (!oldestId) return;

        isLoadingOlder = true;
        const prevScrollHeight = messagesContainer?.scrollHeight ?? 0;
        const prevScrollTop = messagesContainer?.scrollTop ?? 0;

        try {
            const older = await fetchMessages(chatId, { limit: PAGE_SIZE, before_id: oldestId });
            if (older.length < PAGE_SIZE) {
                hasMoreOlder = false;
            }

            queryClient.setQueryData<MessageType[]>(messageKeys.list(chatId), (prev) => {
                const base = prev || [];
                return mergeMessages(base, older);
            });

            await Promise.resolve();

            const nextScrollHeight = messagesContainer?.scrollHeight ?? 0;
            const delta = nextScrollHeight - prevScrollHeight;
            if (messagesContainer) {
                messagesContainer.scrollTop = prevScrollTop + delta;
            }
        } finally {
            isLoadingOlder = false;
        }
    }

    function sendMarkAsRead(messageId: number) {
        if (!chatId || messageId <= lastMarkReadMessageId) return;
        lastMarkReadMessageId = messageId;
        const ws = session.getWebSocket();
        if (ws) {
            ws.send({ type: 'mark_as_read', data: { chat_id: chatId, message_id: messageId } });
        }
        chatContext.updateChatUnreadCount(chatId, 0, messageId);
    }

    function handleScroll(event: Event) {
        event.stopPropagation();
        if (!messagesContainer || !chatId) return;
        
        isUserAtBottom = isAtBottom();
        
        if (messagesContainer.scrollTop <= SCROLL_TOP_THRESHOLD_PX) {
            void loadOlderMessages();
        }

        if (markReadThrottle) return;
        markReadThrottle = setTimeout(() => {
            markReadThrottle = null;
            if (!messagesContainer || messageList.length === 0) return;
            const rect = messagesContainer.getBoundingClientRect();
            const bottom = rect.bottom - 80;
            let bestId = 0;
            const nodes = messagesContainer.querySelectorAll('[data-message-id]');
            nodes.forEach((el) => {
                const id = parseInt((el as HTMLElement).dataset.messageId || '0', 10);
                if (!id || id < 0) return;
                const r = (el as HTMLElement).getBoundingClientRect();
                if (r.top <= bottom) bestId = Math.max(bestId, id);
            });
            if (bestId > 0) sendMarkAsRead(bestId);
        }, MARK_READ_THROTTLE_MS);
    }
    
    function handleReply(event: CustomEvent) {
        const message = messageList.find(m => m.id === event.detail.messageId);
        if (message) {
            chatContext.onReply({ detail: { message } } as CustomEvent<any>);
        }
    }
    
    function handleScrollTo(event: CustomEvent) {
        const messageId = event.detail.messageId;
        const element = messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
        if (element && messagesContainer) {
            const containerRect = messagesContainer.getBoundingClientRect();
            const elementRect = (element as HTMLElement).getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top + messagesContainer.scrollTop;
            const containerHeight = messagesContainer.clientHeight;
            const elementHeight = (element as HTMLElement).clientHeight;
            const targetScrollTop = relativeTop - (containerHeight / 2) + (elementHeight / 2);
            
            messagesContainer.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }
    }

    function handleMessageListClick(event: MouseEvent) {
        if (isMobileDevice()) {
            const messageInput = document.querySelector('.message-input') as HTMLTextAreaElement;
            if (messageInput && document.activeElement === messageInput) {
                event.preventDefault();
                messageInput.focus();
            }
        }
    }
</script>

<div class="message-list" bind:this={messagesContainer} on:scroll={handleScroll} on:wheel|stopPropagation on:click={handleMessageListClick}>
    {#if isLoadingOlder}
        <div class="empty-state">
            <p>{$_('message_list.loading')}</p>
        </div>
    {/if}
    {#if chatId === null}
        {@const emptyText = getEmptyStateText()}
        <div class="empty-state">
            <p>{emptyText.title}</p>
            <p class="hint">{emptyText.hint}</p>
        </div>
    {:else if messageList.length === 0 && !(messagesQuery && $messagesQuery?.isLoading)}
        {@const emptyText = getEmptyStateText()}
        <div class="empty-state">
            <p>{emptyText.title}</p>
            <p class="hint">{emptyText.hint}</p>
        </div>
    {:else if !(messagesQuery && $messagesQuery?.isLoading) && !(chatId === null) && !(messageList.length === 0)}
        {#each groupedMessages as group (group.dateHeader)}
            <div class="date-header">
                <span class="date-text">{group.dateHeader}</span>
            </div>
            
            {#each group.messages as message, index (message.id)}
                {#if firstUnreadMessageId != null && message.id === firstUnreadMessageId}
                    <div class="date-header">
                        <span class="date-text">{$_('message_list.new_messages')}</span>
                    </div>
                {/if}
                {@const prevMessage = index > 0 ? group.messages[index - 1] : null}
                {@const nextMessage = index < group.messages.length - 1 ? group.messages[index + 1] : null}
                
                {@const groupPosition = 
                    (!prevMessage || prevMessage.sender_id !== message.sender_id || new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() >= 480000) &&
                    (!nextMessage || nextMessage.sender_id !== message.sender_id || new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() >= 480000)
                        ? 'single'
                    : (!prevMessage || prevMessage.sender_id !== message.sender_id || new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() >= 480000)
                        ? 'start'
                    : (!nextMessage || nextMessage.sender_id !== message.sender_id || new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() >= 480000)
                        ? 'end'
                        : 'middle'}
                
                {@const replyTo = message.reply_to_message_id ? replyToMap.get(message.reply_to_message_id) : null}

                <Message
                    message={message}
                    currentUserId={$currentUser}
                    myMembership={myMembership}
                    groupPosition={groupPosition}
                    showSender={groupPosition === 'start' || groupPosition === 'single'}
                    replyToMessage={replyTo || null}
                    chatId={chatId}
                    on:reply={handleReply}
                    on:scrollTo={handleScrollTo}
                />
            {/each}
        {/each}
    
    {:else if messagesQuery && $messagesQuery?.isLoading}
        <div class="empty-state">
            <p>{$_('message_list.loading_messages')}</p>
        </div>    
    {/if}
</div>

{#if !isUserAtBottom && messageList.length > 0}
    <button class="scroll-to-bottom-btn" on:click={scrollToBottom} title={$_('message_list.scroll_down')}>
        <ChevronDown size={20} />
    </button>
{/if}

<style>
    .message-list {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
    }
    
    .message-list::-webkit-scrollbar {
        width: 6px;
    }
    
    .message-list::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .message-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        transition: background 0.2s ease;
    }
    
    .message-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .message-list::-webkit-scrollbar-thumb:active {
        background: rgba(255, 255, 255, 0.4);
    }
    
    .message-list {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    
    .message-list:hover {
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }
    
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        opacity: 0.5;
        gap: 8px;
    }
    
    .empty-state .hint {
        font-size: 0.85em;
        opacity: 0.6;
    }
    
    
    .date-header {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 16px 0 8px 0;
        padding: 0 12px;
    }
    
    .date-text {
        background: var(--color-bg-elevated);
        color: var(--color-text);
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 500;
        opacity: 0.8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .scroll-to-bottom-btn {
        position: absolute;
        bottom: 80px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;

        background-image: 
            linear-gradient(var(--surface-glass), var(--surface-glass)),
            linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
                
        color: var(--color-text);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
        transform: translateX(0);
        opacity: 1;
        animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .scroll-to-bottom-btn:hover {
        filter: var(--hover-filter);
        transform: translateX(-4px) scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .scroll-to-bottom-btn:active {
        transform: translateX(-2px) scale(1.02);
    }
</style>
