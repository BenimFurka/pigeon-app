<script lang="ts">
    import { session } from '../../lib/session';
    import type { Message } from '../../types/models';
    import { createEventDispatcher } from 'svelte';
    import { Send } from 'lucide-svelte';
    
    export let chatId: number | null = null;
    export let replyToMessage: Message | null = null;
    
    const dispatch = createEventDispatcher();
    
    let inputValue = '';
    let inputElement: HTMLTextAreaElement;

    function adjustTextareaHeight() {
        if (!inputElement) return;
        inputElement.style.height = 'auto';
        const maxHeight = 200;
        const newHeight = Math.min(Math.max(inputElement.scrollHeight, 40), maxHeight);
        inputElement.style.height = `${newHeight}px`
    }
    
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
        adjustTextareaHeight();
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
        adjustTextareaHeight();
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

    $: if (inputElement) {
        adjustTextareaHeight();
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
        <textarea
            bind:this={inputElement}
            bind:value={inputValue}
            placeholder={replyToMessage ? "Напишите ответ..." : "Напишите сообщение..."}
            on:keydown={handleKeyDown}
            on:input={handleInput}
            class="message-input"
            rows="1"
        ></textarea>
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
    }
    
    .reply-preview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
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
        color: var(--color-text);
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
        align-items: flex-end;
    }
    
    .message-input {
        flex: 1;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background: var(--color-bg-elevated);
        border: none;
        border-radius: var(--radius-sm);
        padding: 10px 10px;
        color: var(--color-text);
        font-size: 14px;
        outline: none;
        transition: var(--transition);
        min-height: 40px;
        max-height: 200px;
        resize: none;
        line-height: 1.4;
        box-sizing: border-box; 
    }
    
    .message-input:focus {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 2px var(--color-accent-soft);
    }
    
    .send-button {
        border: none;
        background: none;
        border-radius: var(--radius-sm);
        padding: 10px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text);
        cursor: pointer;
        transition: var(--transition);
        flex-shrink: 0;
    }
    
    .send-button:hover:not(:disabled) {
        filter: var(--hover-filter);
        transform: scale(1.05);
    }
    
    .send-button:active:not(:disabled) {
        transform: scale(0.95);
    }
    
    .send-button:not(:disabled) {
        background: var(--color-accent);
    }

    .send-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }
</style>

