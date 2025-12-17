<script lang="ts">
    import Message from './Message.svelte';
    import { useMessages } from '../../queries/messages';
    import { currentUser } from '../../stores/auth';
    import { typing } from '../../stores/typing';
    import type { Message as MessageType } from '../../types/models';
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    export let chatId: number | null = null;
    
    let messageList: MessageType[] = [];
    let replyToMessage: MessageType | null = null;
    let messagesContainer: HTMLDivElement;
    let replyToMap: Map<number, MessageType> = new Map();
    
    $: messagesQuery = chatId ? useMessages(chatId, { enabled: !!chatId }) : null;
    
    $: if (chatId && messagesQuery) {
        const data = $messagesQuery?.data || [];
        messageList = data;
        messageList.forEach(msg => {
            if (msg.reply_to_message_id && !replyToMap.has(msg.reply_to_message_id)) {
                const replyTo = messageList.find(m => m.id === msg.reply_to_message_id);
                if (replyTo) {
                    replyToMap.set(msg.reply_to_message_id, replyTo);
                }
            }
        });
        setTimeout(() => scrollToBottom(), 100);
    }
    
    function scrollToBottom() {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
</script>

<div class="message-list no-text-select" bind:this={messagesContainer}>
    {#if chatId === null}
        <div class="empty-state">
            <p>Выберите чат для начала общения</p>
            <p class="hint">Нажмите на чат в списке слева</p>
        </div>
    {:else if messageList.length === 0 && !(messagesQuery && $messagesQuery?.isLoading)}
        <div class="empty-state">
            <p>Нет сообщений</p>
            <p class="hint">Начните общение, отправив первое сообщение</p>
        </div>
    {:else if !(messagesQuery && $messagesQuery?.isLoading) && !(chatId === null) && !(messageList.length === 0)}
        {#each messageList as message, index (message.id)}
            {@const prevMessage = index > 0 ? messageList[index - 1] : null}
            {@const nextMessage = index < messageList.length - 1 ? messageList[index + 1] : null}
            
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
                groupPosition={groupPosition}
                showSender={groupPosition === 'start' || groupPosition === 'single'}
                replyToMessage={replyTo || null}
                on:reply={handleReply}
                on:scrollTo={handleScrollTo}
            />
        {/each}
    
    {:else if messagesQuery && $messagesQuery?.isLoading}
        <div class="empty-state">
            <p>Загрузка сообщений...</p>
        </div>    
    {/if}
    
    {#if typingUsers.length > 0}
        <div class="typing-indicator">
            {#if typingNames.length > 0}
                <span>{typingNames.join(', ')} печатает...</span>
            {:else}
                <span>Печатает...</span>
            {/if}
        </div>
    {/if}
</div>

<style>
    .message-list {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
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
        color: var(--primary-color);
    }

    .no-text-select {
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
    }
</style>

