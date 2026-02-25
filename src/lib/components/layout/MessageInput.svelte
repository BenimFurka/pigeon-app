<script lang="ts">
    import { session } from '$lib/session';
    import type { Message, MessageAttachment } from '$lib/types/models';
    import { createEventDispatcher, onMount } from 'svelte';
    import { Send, Paperclip, ImagePlay } from 'lucide-svelte';
    import AttachmentModal from '$lib/components/forms/modals/AttachmentModal.svelte';
    import GifPicker from '$lib/components/media/GifPicker.svelte';
    import type { GifItem } from '$lib/types/models';
    import { _ } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';
    
    // Props
    export let chatId: number | null = null;
    export let chatContext: {
        replyToMessage: Message | null;
        isMobile: boolean;
        onClearReply: () => void;
        onUserClick: (event: CustomEvent) => void;
    };
    
    // Event dispatcher
    const dispatch = createEventDispatcher();

    // State
    let inputValue = '';
    let inputElement: HTMLTextAreaElement;
    let attachmentModalOpen = false;
    let gifDropdownOpen = false;
    let gifButtonRef: HTMLButtonElement;
    let isTyping = false;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;

    // Computed values
    $: replyToMessage = chatContext.replyToMessage;
    $: isMobile = chatContext.isMobile;

    // Utility functions
    function isMobileDevice(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function getAttachmentType(attachment: MessageAttachment): string {
        const mimeType = attachment.mime_type.toLowerCase();
        const fileType = attachment.file_type.toLowerCase();
        
        if (fileType === 'gif' || mimeType.includes('gif')) return 'gif';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    }

    function getAttachmentTypeName(attachment: MessageAttachment): string {
        const type = getAttachmentType(attachment);
        return $_(`common.attachmentTypes.${type}`);
    }

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function adjustTextareaHeight() {
        if (!inputElement) return;
        inputElement.style.height = 'auto';
        const maxHeight = 200;
        const newHeight = Math.min(Math.max(inputElement.scrollHeight, 40), maxHeight);
        inputElement.style.height = `${newHeight}px`;
        
        if (inputElement.scrollHeight > maxHeight) {
            inputElement.style.overflowY = 'auto';
        } else {
            inputElement.style.overflowY = 'hidden';
        }
    }

    // Event handlers
    function handleSubmit(attachmentIds?: number[]) {
        if (!chatId) {
            if (!inputValue.trim() && !attachmentIds?.length) {
                return;
            }
            dispatch('ephemeralSend', { content: inputValue.trim(), attachmentIds });
            inputValue = '';
            adjustTextareaHeight();
            dispatch('clearReply');
            chatContext.onClearReply();
            
            if (inputElement) {
                queueMicrotask(() => {
                    if (inputElement) inputElement.focus();
                });
            }
            return;
        }
        
        const ws = session.getWebSocket();
        if (!ws) {
            console.error('WebSocket not connected');
            return;
        }
        
        if (inputValue.trim().startsWith('ws-custom:')) {
            try {
                const jsonStr = inputValue.trim().substring('ws-custom:'.length).trim();
                const customMessage = JSON.parse(jsonStr);
                
                ws.send(customMessage);
                
                console.log('Custom WebSocket message sent:', customMessage);
                inputValue = '';
                adjustTextareaHeight();
                dispatch('clearReply');
                chatContext.onClearReply();
                
                if (inputElement) {
                    queueMicrotask(() => {
                        if (inputElement) inputElement.focus();
                    });
                }
                return;
            } catch (error) {
                console.error('Failed to parse custom WebSocket message:', error);
            }
        }
        
        if (!inputValue.trim() && !attachmentIds?.length) {
            return;
        }

        const content = inputValue.trim();
        session.addOptimisticMessage(chatId, content, {
            reply_to: replyToMessage?.id ?? undefined,
            attachment_ids: attachmentIds?.length ? attachmentIds : undefined,
        });

        ws.send({
            type: 'send_message',
            data: {
                chat_id: chatId,
                content,
                reply_to: replyToMessage?.id,
                attachment_ids: attachmentIds?.length ? attachmentIds : undefined
            }
        });
        
        console.log('WebSocket message sent:', {
            type: 'send_message',
            data: {
                chat_id: chatId,
                content: inputValue.trim(),
                reply_to: replyToMessage?.id,
                attachment_ids: attachmentIds?.length ? attachmentIds : undefined
            }
        });
        
        inputValue = '';
        adjustTextareaHeight();
        dispatch('clearReply');
        chatContext.onClearReply();
        
        sendTyping(false);
        
        if (inputElement) {
            queueMicrotask(() => {
                if (inputElement) inputElement.focus();
            });
        }
    }

    function handleAttachmentSent(event: CustomEvent<{ content: string; attachmentIds: number[] }>) {
        const { content, attachmentIds } = event.detail;
        inputValue = content;
        handleSubmit(attachmentIds);
    }

    function handleGifSelected(event: CustomEvent<{ gif: GifItem; attachmentId: number }>) {
        const { gif, attachmentId } = event.detail;
        dispatch('gifSelected', { gif });
        handleSubmit([attachmentId]);
    }

    function openAttachmentModal() {
        if (chatId) {
            attachmentModalOpen = true;
        }
    }

    function toggleGifDropdown(event: MouseEvent) {
        event.stopPropagation();
        
        if (chatId) {
            gifDropdownOpen = !gifDropdownOpen;
        }
    }
    
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    }
    
    function handleInput() {
        if (!chatId) return;
        
        if (!isTyping) {
            sendTyping(true);
            isTyping = true;
        }
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        typingTimeout = setTimeout(() => {
            sendTyping(false);
            isTyping = false;
        }, 2000);
        
        adjustTextareaHeight();
    }
    
    function sendTyping(isTyping: boolean) {
        if (!chatId) return;
        
        const ws = session.getWebSocket();
        if (!ws) return;
        
        ws.send({
            type: 'typing',
            data: {
                chat_id: chatId,
                is_typing: isTyping
            }
        });
    }
    
    function handleCancelReply() {
        chatContext.onClearReply();
    }



    // Reactive statements
    $: if (inputElement) {
        adjustTextareaHeight();
    }
</script>

<div class="message-input-container">
    {#if replyToMessage}
        <div class="reply-preview">
            {#if replyToMessage.attachments && replyToMessage.attachments.length > 0}
                <div class="reply-attachment-preview">
                    {#if replyToMessage.attachments[0].thumbnail_url}
                        <img 
                            src={getUrl(replyToMessage.attachments[0].thumbnail_url)} 
                            alt="" 
                            class="reply-thumbnail"
                        />
                    {:else}
                        <div class="reply-thumbnail-placeholder">
                            {getAttachmentTypeName(replyToMessage.attachments[0]).charAt(0).toUpperCase()}
                        </div>
                    {/if}
                </div>
            {/if}
            <div class="reply-info">
                <span class="reply-label">{$_('message_input.reply_to')}:</span>
                
                <div class="reply-content-container">
                    <div class="reply-content">
                        {#if replyToMessage.attachments && replyToMessage.attachments.length > 0}
                            <em class="attachment-type">{getAttachmentTypeName(replyToMessage.attachments[0])}</em>
                            {#if replyToMessage.content} {replyToMessage.content}{/if}
                        {:else}
                            {replyToMessage.content}
                        {/if}
                    </div>
                </div>
            </div>
            <button class="cancel-reply" on:click={handleCancelReply} title={$_('message_input.cancel_reply')}>×</button>
        </div>
    {/if}
    
    <div class="input-wrapper">
        <button
            class="attachment-button"
            on:click={openAttachmentModal}
            disabled={!chatId}
            title={$_('message_input.attach_file')}
            aria-label={$_('message_input.attach_file')}
            type="button"
        >
            <Paperclip size={18} />
        </button>
        
        <textarea
            bind:this={inputElement}
            bind:value={inputValue}
            placeholder={replyToMessage ? $_('message_input.write_reply') : $_('message_input.write_message')}
            on:keydown={handleKeyDown}
            on:input={handleInput}
            class="message-input"
            rows="1"
        ></textarea>
        

        <div class="gif-button-container">
            <button
                bind:this={gifButtonRef}
                class="gif-button"
                on:click={toggleGifDropdown}
                disabled={!chatId}
                title={$_('message_input.select_gif')}
                aria-label={$_('message_input.open_gif_panel')}
                type="button"
            >
                <ImagePlay size={18} />
            </button>
            
            {#if chatId}
                <GifPicker
                    chatId={chatId}
                    isOpen={gifDropdownOpen}
                    isMobile={isMobile}
                    triggerButton={gifButtonRef}
                    on:close={() => gifDropdownOpen = false}
                    on:selected={handleGifSelected}
                />
            {/if}
        </div>

        <button 
            class="send-button" 
            on:click={(event) => {
                event.preventDefault();
                if (inputElement) inputElement.focus();
                handleSubmit();
            }}
            disabled={!inputValue.trim()}
            title={$_('message_input.send_enter')}
            aria-label={$_('message_input.send_message')}
        >
            <Send size={18} />
        </button>
    </div>

    {#if chatId}
        <AttachmentModal
            chatId={chatId}
            isOpen={attachmentModalOpen}
            isMobile={isMobile}
            on:close={() => attachmentModalOpen = false}
            on:sent={handleAttachmentSent}
        />
    {/if}
</div>

<style>
    .message-input-container {
        display: flex;
        flex-direction: column;
        position: relative;
    }
    
    .reply-preview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--color-bg-elevated);
        border-bottom: 1px solid var(--color-border);
    }
    
    .reply-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        gap: 4px;
    }
    
    .reply-label {
        font-size: 0.75em;
        opacity: 0.7;
        margin-bottom: 2px;
    }
    
    .reply-attachment-preview {
        display: flex;
        align-items: center;
        margin-inline: 6px;
    }
    
    .reply-thumbnail {
        width: 2.5em;
        height: 2.5em;
        border-radius: var(--radius-sm);
        object-fit: cover;
        flex-shrink: 0;
    }
    
    .reply-thumbnail-placeholder {
        width: 2.5em;
        height: 2.5em;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9em;
        color: rgba(255, 255, 255, 0.6);
        flex-shrink: 0;
    }
    
    .reply-content-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .reply-content {
        font-size: 0.85em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .attachment-type {
        font-style: italic;
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
        flex-shrink: 0;
    }
    
    .cancel-reply:hover {
        opacity: 1;
    }
    
    .input-wrapper {
        display: flex;
        gap: 8px;
        padding: 12px;
        align-items: flex-end;
        position: relative;
    }

    .gif-button-container {
        position: relative;
    }

    .attachment-button {
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
        opacity: 0.7;
    }

    .gif-button {
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
        opacity: 0.7;
    }

    .gif-button:hover:not(:disabled) {
        filter: var(--hover-filter);
        transform: scale(1.05);
        opacity: 1;
    }

    .gif-button:active:not(:disabled) {
        transform: scale(0.95);
    }

    .gif-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    .attachment-button:hover:not(:disabled) {
        filter: var(--hover-filter);
        transform: scale(1.05);
        opacity: 1;
    }

    .attachment-button:active:not(:disabled) {
        transform: scale(0.95);
    }

    .attachment-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }
    
    .message-input {
        flex: 1;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
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
        overflow-y: hidden;
        overflow-x: hidden;
    }
    
    .message-input::-webkit-scrollbar {
        width: 4px;
    }
    
    .message-input::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .message-input::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
        transition: background 0.2s ease;
    }
    
    .message-input::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
    }
    
    .message-input::-webkit-scrollbar-thumb:active {
        background: rgba(255, 255, 255, 0.35);
    }
    
    .message-input {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    
    .message-input:hover {
        scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
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
        color: var(--color-button-text);
    }

    .send-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    @media (max-width: 576px) {
        .reply-preview {
            padding: 6px 8px;
        }
        
        .input-wrapper {
            padding: 8px;
            gap: 4px;
        }
        
        .attachment-button,
        .gif-button,
        .send-button {
            width: 36px;
            height: 36px;
            padding: 8px;
        }
        
        .message-input {
            font-size: 16px;
            min-height: 36px;
        }
    }
</style>
