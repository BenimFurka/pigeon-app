<script lang="ts">
    import { session } from '../../lib/session';
    import type { Message } from '../../types/models';
    import { createEventDispatcher } from 'svelte';
    import { Send } from 'lucide-svelte';
    
    export let chatId: number | null = null;
    export let replyToMessage: Message | null = null;
    
    const dispatch = createEventDispatcher();
    
    let inputValue = '';
    let inputElement: HTMLInputElement;
    
    function handleSubmit() {
        if (!chatId || !inputValue.trim()) return;
        
        const ws = session.getWebSocket();
        if (!ws) {
            console.error('WebSocket not connected');
            return;
        }
        
        ws.send({
            type: 'send_message',
            data: {
                chat_id: chatId,
                content: inputValue.trim(),
                reply_to: replyToMessage?.id
            }
        });
        
        inputValue = '';
        dispatch('clearReply');
        
        sendTyping(false);
    }
    
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    }
    
    function handleInput() {
        if (chatId) {
            sendTyping(true);
        }
    }
    
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    
    function sendTyping(isTyping: boolean) {
        if (!chatId) return;
        
        const ws = session.getWebSocket();
        if (!ws) return;
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        ws.send({
            type: 'typing',
            data: {
                chat_id: chatId,
                is_typing: isTyping
            }
        });
        
        if (isTyping) {
            typingTimeout = setTimeout(() => sendTyping(false), 3000);
        }
    }
    
    function handleCancelReply() {
        dispatch('clearReply');
    }
</script>

<div class="message-input-container">
    {#if replyToMessage}
        <div class="reply-preview">
            <div class="reply-info">
                <span class="reply-label">Ответ на:</span>
                <span class="reply-content">{replyToMessage.content}</span>
            </div>
            <button class="cancel-reply" on:click={handleCancelReply} title="Отменить">×</button>
        </div>
    {/if}
    
    <div class="input-wrapper">
        <input
            type="text"
            bind:this={inputElement}
            bind:value={inputValue}
            placeholder={replyToMessage ? "Напишите ответ..." : "Напишите сообщение..."}
            on:keydown={handleKeyDown}
            on:input={handleInput}
            class="message-input"
        />
        <button 
            class="send-button" 
            on:click={handleSubmit}
            disabled={!inputValue.trim() || !chatId}
            title="Отправить (Enter)"
            aria-label="Отправить сообщение"
        >
            <Send size={18} />
        </button>
    </div>
</div>

<style>
    .message-input-container {
        display: flex;
        flex-direction: column;
        /* border-top: 1px solid var(--border-color); */
        background: var(--glass);
    }
    
    .reply-preview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--glass);
    }
    
    .reply-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
    }
    
    .reply-label {
        font-size: 0.75em;
        opacity: 0.7;
        margin-bottom: 2px;
    }
    
    .reply-content {
        font-size: 0.85em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .cancel-reply {
        background: none;
        border: none;
        color: var(--text-color);
        cursor: pointer;
        font-size: 20px;
        padding: 0 8px;
        opacity: 0.7;
        transition: var(--transition);
    }
    
    .cancel-reply:hover {
        opacity: 1;
    }
    
    .input-wrapper {
        display: flex;
        gap: 8px;
        padding: 12px;
        align-items: center;
    }
    
    .message-input {
        flex: 1;
        background: var(--secondary-color);
        border: none;
        border-radius: var(--radius-sm);
        padding: 10px 16px;
        color: var(--text-color);
        font-size: 14px;
        outline: none;
        transition: var(--transition);
    }
    
    .message-input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(var(--primary-color), 0.2);
    }
    
    .send-button {
        background: var(--primary-color);
        border: none;
        border-radius: var(--radius-sm);
        padding: 10px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-color);
        cursor: pointer;
        transition: var(--transition);
        flex-shrink: 0;
    }
    
    .send-button:hover:not(:disabled) {
        filter: var(--hover);
        transform: scale(1.05);
    }
    
    .send-button:active:not(:disabled) {
        transform: scale(0.95);
    }
    
    .send-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }
</style>

