<script lang="ts">
    import type { ChatPreview, MessageAttachment } from '$lib/types/models';
    import { useQueryClient } from '@tanstack/svelte-query';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { presence } from '$lib/stores/presence';
    import { get } from 'svelte/store';
    import { isOlderThan, formatChatListTime } from '$lib/datetime';
    import { ChatType } from '$lib/types/models';
    import { _, format } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';

    // Props
    export let chat: ChatPreview;
    export let selected: boolean = false;

    // Event dispatcher
    const dispatch = createEventDispatcher<{ select: { chat: ChatPreview } }>();

    // Stores
    const queryClient = useQueryClient();
    const presenceStore = { subscribe: presence.subscribe };

    // State
    let isOnline = false;
    let lastMessageTime = '';
    let unsubscribePresence = () => {};

    // Computed values
    $: counterpartId = chat.chat_type === ChatType.DM ? chat.other_user?.id as number | undefined ?? null : null;

    // Reactive statements
    $: if (chat) {
        if (chat.chat_type === ChatType.DM && counterpartId) {
            const presenceData = get(presenceStore)[counterpartId];
            if (!presenceData || isOlderThan(presenceData.updatedAt, { minutes: 5 })) {
                queryClient.invalidateQueries({ 
                    queryKey: ['presence', counterpartId] 
                });
            }
        }
        
        if (chat.last_message?.created_at) {
            lastMessageTime = formatChatListTime(chat.last_message.created_at, $format);
        } else {
            lastMessageTime = '';
        }
    }

    $: if (chat?.chat_type === ChatType.DM) {
        const counterpartId = chat.other_user?.id as number | undefined ?? null;
        if (typeof counterpartId === 'number') {
            unsubscribePresence();
            
            unsubscribePresence = presence.subscribe(($presence) => {
                const record = counterpartId ? $presence[counterpartId] : undefined;
                isOnline = Boolean(record?.online);
            });
            
            const record = get(presenceStore)[counterpartId];
            isOnline = Boolean(record?.online);
        } else {
            unsubscribePresence();
            isOnline = false;
        }
    }

    // Lifecycle hooks
    onDestroy(() => {
        unsubscribePresence();
    });

    // Event handlers
    function handleClick() {
        dispatch('select', { chat });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            dispatch('select', { chat });
        }
    }

    // Utility functions
    function getAttachmentType(attachment: MessageAttachment): string {
        const mimeType = attachment.mime_type.toLowerCase();
        const fileType = attachment.file_type.toLowerCase();
        
        if (fileType === 'gif' || mimeType.includes('gif')) {
            return 'gif';
        }
        if (mimeType.startsWith('image/')) {
            return 'image';
        }
        if (mimeType.startsWith('video/')) {
            return 'video';
        }
        if (mimeType.startsWith('audio/')) {
            return 'audio';
        }
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
</script>

<div 
    class="chat-element no-text-select {selected ? 'selected' : ''}" 
    role="button" 
    tabindex="0"
    on:click={handleClick}
    on:keydown={handleKeydown}
>
    <div class="avatar-wrapper">
        <Avatar avatarUrl={chat.other_user && chat.chat_type === "DM" ? chat.other_user.avatar_url : chat.avatar_url} size="medium" />
        {#if chat.chat_type === ChatType.DM && isOnline}
            <span class="online-dot" aria-hidden="true"></span>
        {/if}
    </div>
    <div class="chat-info">
        <div class="chat-header">
            <span class="chat-name">{chat.other_user && chat.chat_type === "DM" ? chat.other_user.name : chat.name}</span>
            <span class="header-right">
                {#if typeof chat.unread_count === 'number' && chat.unread_count > 0}
                    <span class="unread-badge" aria-label="{chat.unread_count} {$_('chat_element.unread_count')}">{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>
                {/if}
                {#if lastMessageTime}
                    <span class="timestamp">{lastMessageTime}</span>
                {/if}
            </span>
        </div>
        <div class="last-message">
            {#if chat.last_message}
                {#if chat.last_user}
                    <span class="sender-name">{chat.last_user.name}: </span>
                {/if}
                {#if chat.last_message.attachments && chat.last_message.attachments.length > 0}
                    <span class="last-message-content">
                        {#if chat.last_message.attachments[0].thumbnail_url}
                            <img 
                                src={getUrl(chat.last_message.attachments[0].thumbnail_url)} 
                                alt="" 
                                class="mini-thumbnail"
                            />
                        {/if}
                        <em class="attachment-type">{getAttachmentTypeName(chat.last_message.attachments[0])}</em>
                        {#if chat.last_message.content} {chat.last_message.content}{/if}
                    </span>
                {:else}
                    <span class="last-message-content">{chat.last_message.content}</span>
                {/if}
            {:else}
                <span class="last-message empty">{$_('chat_element.no_messages')}</span>
            {/if}
        </div>  
    </div>
</div>

<style>
    .chat-element {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        cursor: pointer;
        border-radius: 8px;
        opacity: 0.85;
        margin: 2px;
        transition: var(--transition);
        min-height: 56px;
        max-height: 56px;
        height: auto;
        box-sizing: border-box;
        width: calc(100% - 8px);
        max-width: 100%;
        overflow: hidden;
        outline: none;
        background: var(--color-bg-elevated);
    }

    .avatar-wrapper {
        position: relative;
        display: inline-flex;
    }

    .online-dot {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-online);
        border: 2px solid var(--color-bg-elevated);
    }

    .sender-name {
        font-weight: 600;
    }

    .chat-element:hover {
        opacity: 1;
        backdrop-filter: var(--hover-filter);
    }
    
    .chat-element.selected {
        opacity: 1;
        background: var(--color-accent);
    }

    .chat-info {
        display: flex;
        flex-direction: column;
        white-space: nowrap;
        overflow: hidden;
        flex: 1;
        min-width: 0;
        position: relative;
    }
    
    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        min-width: 0;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .unread-badge {
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: var(--color-accent);
        color: var(--color-button-text);
        font-size: 0.7em;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .chat-element.selected .unread-badge {
        background: var(--color-button-text);
        color: var(--color-accent);
    }
        
    .chat-name {
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        flex: 1;
        min-width: 0;
    }
    
    .timestamp {
        color: var(--color-text-muted);
        opacity: 0.7;
        font-size: 0.75em;
        white-space: nowrap;
        margin-left: 8px;
        flex-shrink: 0;
    }
    
    .last-message {
        color: var(--color-text-muted);
        opacity: 0.7;
        font-size: 0.8em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        box-sizing: border-box;
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .last-message-content {
        display: flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }

    .chat-element.selected .last-message,
    .chat-element.selected .chat-name,
    .chat-element.selected .timestamp {
        color: var(--color-button-text);
    }
    
    .mini-thumbnail {
        width: 1.2em;
        height: 1.2em;
        border-radius: 2px;
        object-fit: cover;
        filter: blur(0.5px);
        flex-shrink: 0;
    }
    
    .attachment-type {
        font-style: italic;
        opacity: 0.8;
    }
    
    .last-message.empty {
        font-style: italic;
        opacity: 0.5;
    }

    .no-text-select {
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
    }
</style>
