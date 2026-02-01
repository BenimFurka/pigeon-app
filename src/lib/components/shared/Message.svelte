<script lang="ts">
    import type { Message, ChatMember, MessageAttachment } from '$lib/types/models';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import MessageMenu from '$lib/components/shared/MessageMenu.svelte';
    import AttachmentList from '$lib/components/media/AttachmentList.svelte';
    import ReactionList from '$lib/components/shared/ReactionList.svelte';
    import { session } from '$lib/session';
    import { useProfile } from '$lib/queries/profile';
    import { reactions } from '$lib/stores/reactions';
    import { createEventDispatcher } from 'svelte';
    import type { UserPublic } from '$lib/types/models';
    import { _ } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';
    
    export let message: Message;
    export let showSender: boolean = true;
    export let groupPosition: string | 'single' | 'start' | 'middle' | 'end' = 'single';
    export let currentUserId: number | null = null;
    export let myMembership: ChatMember | undefined;
    export let replyToMessage: Message | null = null;

    const dispatch = createEventDispatcher();

    let sender: UserPublic | null = null;
    let replyToUser: UserPublic | null = null;
    let isEditing = false;
    let editContent = '';
    let menuOpen = false;
    let menuX = 0;
    let menuY = 0;

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

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getAttachmentTypeName(attachment: MessageAttachment): string {
        const type = getAttachmentType(attachment);
        return $_(`common.attachmentTypes.${type}`);
    }

    $: senderQuery = message.sender_id ? useProfile(message.sender_id, { enabled: !!message.sender_id && !isOwn }) : null;
    $: if (senderQuery && $senderQuery?.data) {
        sender = $senderQuery.data;
    }
    
    $: replyToUserQuery = replyToMessage?.sender_id ? useProfile(replyToMessage.sender_id, { 
        enabled: !!replyToMessage?.sender_id 
    }) : null;
    $: if (replyToUserQuery && $replyToUserQuery?.data) {
        replyToUser = $replyToUserQuery.data;
    }

    $: timeStr = formatTime(message.created_at);
    
    function formatTime(timestamp: string) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    $: isOwn = message.sender_id == currentUserId;
    $: isDeleted = false;
    $: messageReactions = $reactions[message.id] || message.reactions || [];
    
    $: canReply = Boolean(myMembership?.can_send_messages);
    $: canEdit = isOwn;
    $: canDelete = isOwn || Boolean(myMembership?.can_manage_messages);
    
    function handleReplyClick() {
        dispatch('reply', { messageId: message.id, senderId: message.sender_id });
    }
    
    function handleAddReaction(emoji: string) {
        const ws = session.getWebSocket();
        if (ws) {
            ws.send({
                type: 'add_reaction',
                data: {
                    message_id: message.id,
                    emoji
                }
            });
        }
    }
    
    function handleRemoveReaction(emoji: string) {
        const ws = session.getWebSocket();
        if (ws && currentUserId) {
            ws.send({
                type: 'remove_reaction',
                data: {
                    message_id: message.id,
                    emoji
                }
            });
        }
    }
    
    function handleEdit() {
        isEditing = true;
        editContent = message.content;
    }
    
    function handleSaveEdit() {
        const ws = session.getWebSocket();
        if (ws && editContent.trim()) {
            ws.send({
                type: 'edit_message',
                data: {
                    message_id: message.id,
                    content: editContent.trim()
                }
            });
            isEditing = false;
        }
    }
    
    function handleCancelEdit() {
        isEditing = false;
        editContent = '';
    }
    
    function handleDelete() {
        if (confirm('Удалить это сообщение?')) {
            const ws = session.getWebSocket();
            if (ws) {
                ws.send({
                    type: 'delete_message',
                    data: {
                        message_id: message.id
                    }
                });
            }
        }
    }
    
    function handleCopy() {
        const text = message.content || '';
        if (!text) return;
        
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }
    
    function fallbackCopy(text: string) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
        
        document.body.removeChild(textArea);
    }

    function openMenu(e: MouseEvent) {
        e.preventDefault();
        menuX = e.clientX;
        menuY = e.clientY;
        menuOpen = true;
    }

    function closeMenu() {
        menuOpen = false;
    }
</script>

<div class="message {isOwn ? 'own' : 'other'} {groupPosition} {isDeleted ? 'deleted' : ''}"
     data-message-id={message.id}
     data-sender-id={message.sender_id}
     data-timestamp={message.created_at}
     on:contextmenu={openMenu}
     role="presentation">
    
    {#if (groupPosition === 'single' || groupPosition === 'end') && sender}
        <div class="avatar-wrapper">
            <Avatar 
                avatarUrl={sender.avatar_url} 
                size="small" 
                className="message-avatar"
            />
        </div>
    {/if}
    
    <div class="message-content">
        {#if showSender}
            <div class="sender">
                {sender?.name || sender?.username || ''}
            </div>
        {/if}
        
        {#if isEditing}
            <div class="edit-container">
                <input 
                    type="text" 
                    bind:value={editContent}
                    class="edit-input"
                    on:keydown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                    }}
                />
                <div class="edit-actions">
                    <button class="edit-btn save" on:click={handleSaveEdit}>Сохранить</button>
                    <button class="edit-btn cancel" on:click={handleCancelEdit}>Отмена</button>
                </div>
            </div>
        {:else if isDeleted}
            <div class="content deleted">
                <em>Сообщение удалено</em>
            </div>
        {:else}
            <div class="content bubble">
                {#if message.reply_to_message_id && replyToMessage}
                    <button 
                        class="reply-preview" 
                        on:click={() => dispatch('scrollTo', { messageId: replyToMessage.id })}
                        on:keydown={(e) => e.key === 'Enter' && dispatch('scrollTo', { messageId: replyToMessage.id })}
                        type="button"
                    >
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
                        <div class="reply-content-container">
                            <div class="reply-indicator">
                                {replyToMessage.sender_id === currentUserId ? 'Вы' : (replyToUser?.name || replyToUser?.username || 'Пользователь')}
                            </div>
                            <div class="reply-content">
                                {#if replyToMessage.attachments && replyToMessage.attachments.length > 0}
                                    <em class="attachment-type">{getAttachmentTypeName(replyToMessage.attachments[0])}</em>
                                    {#if replyToMessage.content} {replyToMessage.content}{/if}
                                {:else}
                                    {replyToMessage.content}
                                {/if}
                            </div>
                        </div>
                    </button>
                {/if}
                
                {#if message.attachments && message.attachments.length > 0}
                    <AttachmentList attachments={message.attachments} {isOwn} />
                {/if}
                
                {#if message.content}
                    <div class="message-text">{message.content}</div>
                {/if}
                
                {#if messageReactions && messageReactions.length > 0}
                    <ReactionList 
                        reactions={messageReactions} 
                        {currentUserId} 
                        isOwnMessage={isOwn}
                        messageId={message.id}
                        on:addReaction={(e) => { handleAddReaction(e.detail.emoji); }}
                        on:removeReaction={(e) => { handleRemoveReaction(e.detail.emoji); }}
                    />
                {/if}

                <div class="bubble-footer">
                    <span class="time">{timeStr}</span>
                    {#if message.is_edited && message.edited_at}
                        <span class="edited-time" title="Отредактировано {new Date(message.edited_at).toLocaleString()}">
                            изменено
                        </span>
                    {/if}
                </div>
            </div>
        {/if}
        
    </div>
    
    <MessageMenu
        x={menuX}
        y={menuY}
        isOpen={menuOpen && !isDeleted}
        canReply={canReply}
        canEdit={canEdit}
        canDelete={canDelete}
        messageId={message.id}
        {currentUserId}
        existingReactions={messageReactions}
        on:close={closeMenu}
        on:reply={() => { closeMenu(); handleReplyClick(); }}
        on:edit={() => { closeMenu(); handleEdit(); }}
        on:copy={() => { closeMenu(); handleCopy(); }}
        on:delete={() => { closeMenu(); handleDelete(); }}
        on:addReaction={(e) => { handleAddReaction(e.detail.emoji); }}
        on:removeReaction={(e) => { handleRemoveReaction(e.detail.emoji); }}
    />
</div>

<style>
    .message {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 4px 12px;
        position: relative;
    }
    
    .message.other {
        padding-left: 52px;
    }
    
    .message.own {
        padding-right: 52px;
    }
    
    .message.other:has(.avatar-wrapper) {
        padding-left: 12px;
    }
    
    .message.own:has(.avatar-wrapper) {
        padding-right: 12px;
    }
    
    .message:hover {
        background: rgba(0, 0, 0, 0.08);
    }
    
    .message.own { flex-direction: row-reverse; }
    
    .message:is(.start, .middle, .end) {
        padding-top: 2px;
        padding-bottom: 2px;
    }
    
    .message:is(.middle, .end) .sender {
        display: none;
    }

    .message-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    
    .sender {
        font-weight: 600;
        font-size: 0.85em;
        color: var(--color-text);
        margin-bottom: 2px;
        max-width: 60%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .own .sender {
        margin-left: auto;
        margin-right: 8px;
    }
    
    .other .sender {
        margin-right: auto;
        margin-left: 8px;
    }

    .reply-preview {
        border: none;
        padding: 4px 8px;
        margin-bottom: 6px;
        backdrop-filter: blur(2px);
        background-color: rgba(255, 255, 255, 0.08);
        border-left: 3px solid rgba(255, 255, 255, 0.16);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8em;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        height: 3.0em;
        display: flex;
        align-items: center;
        gap: 8px;
        overflow: hidden;
        transition: var(--transition);
        scale: 1.0;
    }

    .reply-preview:hover {
        scale: 1.005;
    }
    
    .reply-attachment-preview {
        flex-shrink: 0;
        width: 2.5em;
        height: 2.5em;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .reply-thumbnail {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(1px);
    }
    
    .reply-thumbnail-placeholder {
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 0.9em;
        color: rgba(255, 255, 255, 0.6);
    }
    
    .reply-content-container {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
    }
    
    .reply-indicator {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2em;
    }
    
    .reply-content {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2em;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .attachment-type {
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
    }

    .content {
        white-space: pre-line;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4; 
    }

    .bubble {
        position: relative;
        display: inline-block;
        max-width: 60%;
        padding: 8px 10px;
        background: var(--bubble-bg, rgba(255,255,255,0.06));
    }
    
    .other .bubble { --bubble-bg: rgba(255,255,255,0.06); }
    .own .bubble { --bubble-bg: var(--color-accent); }
    
    .other .bubble { margin-right: auto; }
    .own .bubble { margin-left: auto; }

    .message.other:is(.single, .end) .bubble {  border-radius: 12px 12px 6px 0px;}
    .message.own:is(.single, .end) .bubble { border-radius: 12px 12px 0px 6px; }

    .message:where(.own, .other):is(.start) .bubble {  border-radius: 12px 12px 6px 6px;}

    .message.other:is(.middle) .bubble {  border-radius: 6px 12px 12px 6px;}
    .message.own:is(.middle) .bubble {  border-radius: 12px 6px 6px 12px;}

    .bubble-footer {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
        align-items: center;
        margin-top: 4px;
        font-size: 0.75em;
        opacity: 0.8;
    }
    
    .message.own:is(.single, .end) .message-content .content.bubble::before {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        top: calc(100% - 8px);
        left: 100%;
        background-color: inherit;
        clip-path: polygon(100% 100%, 0% 0%, 0% 100%);
    }

   .message.other:is(.single, .end) .message-content .content.bubble::before {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        top: calc(100% - 8px);
        right: 100%;
        background-color: inherit;
        clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
    }

    .edit-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .edit-input {
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-accent);
        border-radius: 4px;
        padding: 8px;
        color: var(--color-text);
        font-size: 14px;
    }
    
    .edit-actions {
        display: flex;
        gap: 8px;
    }
    
    .edit-btn {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .edit-btn.save {
        background: var(--color-accent);
        color: var(--color-text);
    }
    
    .edit-btn.cancel {
        background: transparent;
        color: var(--color-text);
        border: 1px solid var(--color-border);
    }

    .message-text {
        white-space: pre-line;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
    }

    .own * {
        color: var(--color-button-text);
    }   

    .other * {
        color: var(--color-text);
    }
    
    .avatar-wrapper {
        flex-shrink: 0;
        margin-bottom: 2px;
    }
    
    .avatar-spacer {
        width: 32px;
        flex-shrink: 0;
    }
    
    .message-avatar {
        width: 32px !important;
        height: 32px !important;
    }   
</style>
