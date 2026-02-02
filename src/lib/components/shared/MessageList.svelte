<script lang="ts">
    import Message from '$lib/components/shared/Message.svelte';
    import { fetchMessages, messageKeys, useMessages } from '$lib/queries/messages';
    import { useChat } from '$lib/queries/chats';
    import { currentUser } from '$lib/stores/auth';
    import { typing } from '$lib/stores/typing';
    import type { Message as MessageType, ChatMember } from '$lib/types/models';
    import { createEventDispatcher } from 'svelte';
    import { queryClient } from '$lib/query';
    import { formatDateHeader } from '$lib/datetime';
    import { ChevronDown } from 'lucide-svelte';
    import { ChatType } from '$lib/types/models';
    
    const dispatch = createEventDispatcher();
    
    export let chatId: number | null = null;
    export let myMembership: ChatMember | undefined;
    export let chatType: string | null = null;
    
    let messageList: MessageType[] = [];
    let replyToMessage: MessageType | null = null;
    let messagesContainer: HTMLDivElement;
    let replyToMap: Map<number, MessageType> = new Map();

    const PAGE_SIZE = 50;
    const loadedChats = new Set<number>();
    const SCROLL_TOP_THRESHOLD_PX = 120;

    let isLoadingOlder = false;
    let hasMoreOlder = true;
    let didInitialScroll = false;
    let lastChatId: number | null = null;
    let lastMessageCount = 0;
    let isUserAtBottom = true;
    
    $: messagesQuery = chatId ? useMessages(chatId, { enabled: !!chatId, params: { limit: PAGE_SIZE } }) : null;
    $: chatQuery = chatId && !chatType ? useChat(chatId, { enabled: !!chatId && !chatType }) : null;
    $: effectiveChatType = chatType || $chatQuery?.data?.chat_type || null;
    
    $: if (chatId && messagesQuery) {
        const data = $messagesQuery?.data || [];
        messageList = data;

        if (chatId !== lastChatId) {
            lastChatId = chatId;
            didInitialScroll = false;
            hasMoreOlder = true;
            replyToMap = new Map();
            lastMessageCount = 0;
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
            setTimeout(() => scrollToBottom(), 0);
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
    
    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    function handleScroll() {
        if (!messagesContainer) return;
        
        isUserAtBottom = isAtBottom();
        
        if (messagesContainer.scrollTop <= SCROLL_TOP_THRESHOLD_PX) {
            void loadOlderMessages();
        }
    }
    
    function handleReply(event: CustomEvent) {
        const message = messageList.find(m => m.id === event.detail.messageId);
        if (message) {
            replyToMessage = message;
            dispatch('reply', { message });
        }
    }
    
    function handleScrollTo(event: CustomEvent) {
        const messageId = event.detail.messageId;
        const element = messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    $: typingUsers = chatId ? typing.getTypingUsers(chatId) : [];
    let typingNames: string[] = [];
    // TODO: optionally derive names via useProfile 
    $: if (typingUsers.length > 0) {
        typingNames = [];
    } else {
        typingNames = typingUsers.map(num => num.toString());
    }

    $: groupedMessages = messageList.reduce((groups, message, index) => {
        const messageDate = new Date(message.created_at).toDateString();
        const prevMessage = index > 0 ? messageList[index - 1] : null;
        
        const isNewDay = !prevMessage || new Date(prevMessage.created_at).toDateString() !== messageDate;
        
        if (isNewDay) {
            groups.push({
                dateHeader: formatDateHeader(message.created_at),
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

    function getEmptyStateText() {
        switch (effectiveChatType) {
            case ChatType.DM:
                return {
                    title: "Нет сообщений",
                    hint: "Начните общение, отправив первое сообщение"
                };
            case ChatType.GROUP:
                return {
                    title: "Нет сообщений в группе",
                    hint: "Будьте первым, кто начнет диалог в этой группе"
                };
            case ChatType.CHANNEL:
                return {
                    title: "Нет публикаций",
                    hint: "Здесь пока нет публикаций. Подпишитесь, чтобы не пропустить обновления"
                };
            default:
                return {
                    title: "Нет сообщений",
                    hint: "Начните общение, отправив первое сообщение"
                };
        }
    }
</script>

<div class="message-list" bind:this={messagesContainer} on:scroll={handleScroll}>
    {#if isLoadingOlder}
        <div class="empty-state">
            <p>Загрузка...</p>
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
                    on:reply={handleReply}
                    on:scrollTo={handleScrollTo}
                />
            {/each}
        {/each}
    
    {:else if messagesQuery && $messagesQuery?.isLoading}
        <div class="empty-state">
            <p>Загрузка сообщений...</p>
        </div>    
    {/if}
    
    <!--{#if typingUsers.length > 0}
        <div class="typing-indicator">
            {#if typingNames.length > 0}
                <span>{typingNames.join(', ')} печатает...</span>
            {:else}
                <span>Печатает...</span>
            {/if}
        </div>
    {/if}-->
</div>

{#if !isUserAtBottom && messageList.length > 0}
    <button class="scroll-to-bottom-btn" on:click={scrollToBottom} title="Вниз">
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
    
    /* Custom scrollbar styles */
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
    
    /* Firefox scrollbar styles */
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
    
    .typing-indicator {
        padding: 8px 12px;
        font-size: 0.85em;
        opacity: 0.7;
        font-style: italic;
        color: var(--color-accent);
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

