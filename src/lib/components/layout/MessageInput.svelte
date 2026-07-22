<script lang="ts">
    import { session } from '$lib/session';
    import { wsService } from '$lib/ws-service';
    import type { Message, MessageMedia, GifMedia } from '$lib/types/models';
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { Send, Paperclip, ImagePlay, Smile, Maximize2 } from 'lucide-svelte';
    import AttachmentModal from '$lib/components/forms/modals/AttachmentModal.svelte';
    import GifPicker from '$lib/components/media/GifPicker.svelte';
    import EmojiPicker from '$lib/components/media/EmojiPicker.svelte';
    import type { GifItem } from '$lib/types/models';
    import { _ } from 'svelte-i18n';
    import { getServerUrl, config } from '$lib/config';
    import { getMediaTypeName } from '$lib/utils/media';
    import { hotkeys, matchesHotkey, pendingEditMessageId } from '$lib/stores/hotkeys';
    import { queryClient } from '$lib/query';
    import { messageKeys } from '$lib/queries/messages';
    import { useCurrentProfile } from '$lib/queries/profile';
    import CodeMirrorEditor from '$lib/components/editor/CodeMirrorEditor.svelte';
    import { md, normalizeMarkdown } from '$lib/utils/markdown';

    // Props
    export let chatId: number | null = null;
    export let chatContext: {
        replyToMessage: Message | null;
        isMobile: boolean;
        onClearReply: () => void;
        onUserClick: (event: CustomEvent) => void;
    };
    export let allowFullEditor: boolean = true;
    
    // Event dispatcher
    const dispatch = createEventDispatcher();

    // State
    let editorComponent: CodeMirrorEditor;
    let currentMarkdown = '';
    let attachmentModalOpen = false;
    let gifDropdownOpen = false;
    let gifButtonRef: HTMLButtonElement;
    let emojiPickerOpen = false;
    let emojiButtonRef: HTMLButtonElement;
    let isTyping = false;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    let pastedText = '';
    let pastedFiles: File[] = [];

    const profileQuery = useCurrentProfile();

    // Computed values
    $: replyToMessage = chatContext.replyToMessage;
    $: isMobile = chatContext.isMobile;
    $: showFullEditor = allowFullEditor && $config.app.experimental.enableFullEditor;
    $: sendKeyBinding = $hotkeys.send_message;

    $: renderedReplyContent = replyToMessage?.content ? (() => {
        const normalized = normalizeMarkdown(replyToMessage.content);
        const processed = md.render(normalized).trim().replace(/<\/div>\s*\n/g, '</div>');
        return processed;
    })() : '';

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function formatSendKeyHint(binding: any): string {
        if (!binding) return $_('message_input.send_enter');
        const parts: string[] = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.alt) parts.push('Alt');
        if (binding.shift) parts.push('Shift');
        if (binding.meta) parts.push('Meta');
        parts.push(binding.key === ' ' ? 'Space' : binding.key);
        const keyStr = parts.join('+');
        return $_('message_input.send_enter').replace('Enter', keyStr);
    }

    export function focus() {
        editorComponent?.focusEditor();
    }

    export function getValue(): string {
        return currentMarkdown;
    }
    
    export function setMarkdown(md: string) {
        currentMarkdown = md;
        editorComponent?.setEditorMarkdown(md);
    }

    export function handleSubmit(attachmentIds?: number[], media?: MessageMedia[]) {
        const content = currentMarkdown.trim();
        
        if (!chatId) {
            if (!content && !attachmentIds?.length && !media?.length) return;
            
            dispatch('ephemeralSend', { content, attachmentIds, media });
            editorComponent?.clearEditor();
            currentMarkdown = '';
            dispatch('clearReply');
            chatContext.onClearReply();
            
            queueMicrotask(() => editorComponent?.focusEditor());
            return;
        }
        
        if (content.startsWith('ws-custom:')) {
            try {
                const jsonStr = content.substring('ws-custom:'.length).trim();
                const customMessage = JSON.parse(jsonStr);
                
                wsService.send(customMessage);
                console.log('Custom WebSocket message sent:', customMessage);
                
                editorComponent?.clearEditor();
                currentMarkdown = '';
                dispatch('clearReply');
                chatContext.onClearReply();
                
                queueMicrotask(() => editorComponent?.focusEditor());
                return;
            } catch (error) {
                console.error('Failed to parse custom WebSocket message:', error);
            }
        }
        
        if (!content && !attachmentIds?.length && !media?.length) {
            return;
        }

        session.addOptimisticMessage(chatId, content, {
            reply_to: replyToMessage?.id ?? undefined,
            attachment_ids: attachmentIds?.length ? attachmentIds : undefined,
            media: media?.length ? media : undefined,
        });

        const messageData: any = {
            chat_id: chatId,
            content,
            reply_to: replyToMessage?.id,
        };

        if (attachmentIds?.length) messageData.attachment_ids = attachmentIds;
        if (media?.length) messageData.media = media;

        wsService.send({ type: 'send_message', data: messageData });
        
        editorComponent?.clearEditor();
        currentMarkdown = '';
        dispatch('clearReply');
        chatContext.onClearReply();
        
        sendTyping(false);
        queueMicrotask(() => editorComponent?.focusEditor());
    }

    function handleEditorChange(event: CustomEvent<{ markdown: string }>) {
        currentMarkdown = event.detail.markdown;
        if (!chatId) return;
        
        if (!isTyping) {
            sendTyping(true);
            isTyping = true;
        }
        
        if (typingTimeout) clearTimeout(typingTimeout);
        
        typingTimeout = setTimeout(() => {
            sendTyping(false);
            isTyping = false;
        }, 2000);
    }

    function handleEditorSubmit() {
        handleSubmit();
    }

    function handleAttachmentSent(event: CustomEvent<{ content: string; media: MessageMedia[] }>) {
        const { content, media } = event.detail;
        currentMarkdown = content;
        editorComponent?.setEditorMarkdown(currentMarkdown);
        handleSubmit(undefined, media);
        attachmentModalOpen = false;
        pastedText = '';
        pastedFiles = [];
    }

    function handleGifSelected(event: CustomEvent<{ gif: GifItem; media: GifMedia }>) {
        const { gif, media } = event.detail;
        dispatch('gifSelected', { gif });
        handleSubmit(undefined, [media]);
    }

    function openAttachmentModal() {
        if (chatId) attachmentModalOpen = true;
    }

    function toggleGifDropdown(event: MouseEvent) {
        event.stopPropagation();
        if (chatId) gifDropdownOpen = !gifDropdownOpen;
    }
    
    function handleKeyDown(event: KeyboardEvent) {
        if (
            matchesHotkey(event, $hotkeys.edit_last_message) &&
            !currentMarkdown.trim() &&
            chatId
        ) {
            event.preventDefault();
            requestEditLastMessage();
        }
    }

    function requestEditLastMessage() {
        if (!chatId) return;
        const myId = $profileQuery?.data?.id;
        if (myId == null) return;

        const messages = queryClient.getQueryData<Message[]>(messageKeys.list(chatId)) || [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.sender_id === myId && m.id > 0 && !m.new_chat_members && !m.left_chat_member) {
                pendingEditMessageId.set(m.id);
                return;
            }
        }
    }

    function toggleEmojiPicker(event: MouseEvent) {
        event.stopPropagation();
        emojiPickerOpen = !emojiPickerOpen;
        if (emojiPickerOpen) gifDropdownOpen = false;
    }

    function handleEmojiSelect(event: CustomEvent<{ emoji: string }>) {
        currentMarkdown += event.detail.emoji;
        editorComponent?.setEditorMarkdown(currentMarkdown);
        emojiPickerOpen = false;
        queueMicrotask(() => editorComponent?.focusEditor());
    }

    function handlePaste(event: ClipboardEvent) {
        if (!chatId) return;
        const items = event.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }

        if (files.length > 0) {
            event.preventDefault();
            pastedText = currentMarkdown;
            pastedFiles = files;
            currentMarkdown = '';
            editorComponent?.setEditorMarkdown('');
            attachmentModalOpen = true;
        }
    }
    
    function sendTyping(isTyping: boolean) {
        if (!chatId) return;
        wsService.send({
            type: 'typing',
            data: { chat_id: chatId, is_typing: isTyping }
        });
    }
    
    function handleCancelReply() {
        chatContext.onClearReply();
    }

    function handleOpenFullEditor() {
        dispatch('openFullEditor', { content: currentMarkdown });
    }
</script>

<div class="message-input-container">
    {#if replyToMessage}
        <div class="reply-preview">
            {#if replyToMessage.media && replyToMessage.media.length > 0 && (replyToMessage.media[0].type === 'Photo' || replyToMessage.media[0].type === 'Video' || replyToMessage.media[0].type === 'Gif')}
                <div class="reply-attachment-preview">
                    <img 
                        src={getUrl(replyToMessage.media[0].type === 'Gif'
                            ? (replyToMessage.media[0].preview_url || replyToMessage.media[0].file_url)
                            : (replyToMessage.media[0].thumbnail_url || replyToMessage.media[0].file_url)
                        )} 
                        alt="" 
                        class="reply-thumbnail"
                    />
                </div>
            {/if}
            <div class="reply-info">
                <span class="reply-label">{$_('message_input.reply_to')}:</span>
                <div class="reply-content-container markdown-inline">
                    <div class="reply-content">
                        {#if replyToMessage.media && replyToMessage.media.length > 0}
                            <em class="attachment-type">{getMediaTypeName(replyToMessage.media[0], $_)}</em>
                        {/if}
                        {#if renderedReplyContent}
                            <span class="reply-text-content">{@html renderedReplyContent}</span>
                        {/if}
                    </div>
                </div>
            </div>
            <button class="cancel-reply" on:click={handleCancelReply} title={$_('message_input.cancel_reply')}>×</button>
        </div>
    {/if}
    
    <div class="input-wrapper" on:paste={handlePaste}>
        <button
            class="icon-button"
            on:click={openAttachmentModal}
            disabled={!chatId}
            title={$_('message_input.attach_file')}
            aria-label={$_('message_input.attach_file')}
            type="button"
        >
            <Paperclip size={18} />
        </button>
        
        <div class="editor-wrapper">
            
            <CodeMirrorEditor
                hotkeyAction="send_message"
                bind:this={editorComponent}
                placeholder={replyToMessage ? $_('message_input.write_reply') : $_('message_input.write_message')}
                on:change={handleEditorChange}
                on:submit={handleEditorSubmit}
            />
        </div>

        {#if showFullEditor}
            <button
                class="icon-button full-editor-button"
                on:click={handleOpenFullEditor}
                title={$_('message_input.open_full_editor')}
                aria-label={$_('message_input.open_full_editor')}
                type="button"
            >
                <Maximize2 size={18} />
            </button>
        {/if}

        <div class="gif-button-container">
            <button
                bind:this={emojiButtonRef}
                class="icon-button"
                on:click={toggleEmojiPicker}
                title={$_('message_input.select_emoji')}
                aria-label={$_('message_input.select_emoji')}
                type="button"
            >
                <Smile size={18} />
            </button>
            <EmojiPicker
                isOpen={emojiPickerOpen}
                isMobile={isMobile}
                triggerButton={emojiButtonRef}
                on:close={() => (emojiPickerOpen = false)}
                on:select={handleEmojiSelect}
            />
        </div>

        <div class="gif-button-container">
            <button
                bind:this={gifButtonRef}
                class="icon-button"
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
                editorComponent?.focusEditor();
                handleSubmit();
            }}
            disabled={!currentMarkdown.trim()}
            title={formatSendKeyHint(sendKeyBinding)}
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
            initialContent={pastedText}
            initialFiles={pastedFiles}
            on:close={() => {
                attachmentModalOpen = false;
                pastedText = '';
                pastedFiles = [];
            }}
            on:sent={handleAttachmentSent}
        />
    {/if}
</div>

<style lang="scss">
    @import '../../../styles/markdown/markdown-inline.scss';

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
    
    .reply-content-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .reply-content {
        @extend .markdown-inline;
        
        font-size: 0.85em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .attachment-type { font-style: italic; }
    
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
    
    .cancel-reply:hover { opacity: 1; }
    
    .input-wrapper {
        display: flex;
        gap: 8px;
        padding: 12px;
        align-items: flex-end;
        position: relative;
    }

    .editor-wrapper {
        flex: 1;
        min-width: 0;
    }

    .gif-button-container { position: relative; }

    .icon-button {
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

    .icon-button:hover:not(:disabled) {
        filter: var(--hover-filter);
        transform: scale(1.05);
        opacity: 1;
    }

    .icon-button:active:not(:disabled) { transform: scale(0.95); }
    .icon-button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    
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
    
    .send-button:active:not(:disabled) { transform: scale(0.95); }
    .send-button:not(:disabled) { background: var(--color-accent); color: var(--color-button-text); }
    .send-button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    @media (max-width: 576px) {
        .reply-preview { padding: 6px 8px; }
        .input-wrapper { padding: 8px; gap: 4px; }
        .icon-button, .send-button { width: 36px; height: 36px; padding: 8px; }
    }
</style>