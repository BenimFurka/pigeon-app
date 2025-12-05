<script lang="ts">
    import type { Message } from '../../types/models';
    import Avatar from './Avatar.svelte';
    import MessageMenu from './MessageMenu.svelte';
    import { session } from '../../lib/session';
    import { useProfile } from '../../queries/profile';
    import { createEventDispatcher } from 'svelte';
    
    export let message: Message;
    export let showSender: boolean = true;
    export let groupPosition: string | 'single' | 'start' | 'middle' | 'end' = 'single';
    export let currentUserId: number | null = null;
    export let replyToMessage: Message | null = null;

    const dispatch = createEventDispatcher();

    let senderName = '';
    let isEditing = false;
    let editContent = '';
    let menuOpen = false;
    let menuX = 0;
    let menuY = 0;

    $: senderQuery = message.sender_id && !isOwn ? useProfile(message.sender_id, { enabled: !!message.sender_id && !isOwn }) : null;
    $: if (senderQuery && $senderQuery?.data) {
        const p = $senderQuery.data;
        senderName = p.name || p.username || '';
    }

    $: timeStr = formatTime(message.created_at);
    
    function formatTime(timestamp: string) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    $: isOwn = message.sender_id == currentUserId;
    $: isDeleted = false;
    $: reactions = message.reactions || [];
    
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
            navigator.clipboard.writeText(text).catch(() => {});
        }
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
    
    <!-- TODO: Avatar, {#if !isGrouped && !isOwn}
        
    {/if}-->
    
    <div class="message-content">
        {#if showSender}
            <div class="sender">
                {senderName}
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
                        <div class="reply-indicator">↶ {replyToMessage.sender_id === currentUserId ? 'Вы' : senderName}</div>
                        <div class="reply-content">{replyToMessage.content}</div>
                    </button>
                {/if}
                {message.content}
                <div class="bubble-footer">
                    <span class="time">{timeStr}</span>
                    {#if message.is_edited && message.edited_at}
                        <span class="edited-time" title="Отредактировано {new Date(message.edited_at).toLocaleString()}">
                            (ред.)
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
        canEdit={isOwn}
        on:close={closeMenu}
        on:reply={() => { closeMenu(); handleReplyClick(); }}
        on:edit={() => { closeMenu(); handleEdit(); }}
        on:copy={() => { closeMenu(); handleCopy(); }}
        on:delete={() => { closeMenu(); handleDelete(); }}
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
    
    .message:hover {
        background: rgba(0, 0, 0, 0.02);
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
        color: var(--text-color);
        margin-bottom: 2px;
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
        line-height: 1.3em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        transition: var(--transition);
        scale: 1.0;
    }

    .reply-preview:hover {
        scale: 1.005;
    }
    
    .reply-indicator {
        color: var(--text-color);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .reply-content {
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .content { word-wrap: break-word; line-height: 1.4; }

    .bubble {
        position: relative;
        display: inline-block;
        max-width: 60%;
        padding: 8px 10px;
        background: var(--bubble-bg, rgba(255,255,255,0.06));
    }
    
    .other .bubble { --bubble-bg: rgba(255,255,255,0.06); }
    .own .bubble { --bubble-bg: var(--primary-color); }
    
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
        color: var(--text-color);
        opacity: 0.8;
    }
    
    .message.own:is(.single, .end) .message-content .content.bubble::before {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        bottom: 0;
        left: 100%;
        background-color: inherit;
        clip-path: polygon(100% 100%, 0% 0%, 0% 100%);
        
    }

   .message.other:is(.single, .end) .message-content .content.bubble::before {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        bottom: 0;
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
        background: var(--secondary-color);
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        padding: 8px;
        color: var(--text-color);
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
        background: var(--primary-color);
        color: var(--text-color);
    }
    
    .edit-btn.cancel {
        background: transparent;
        color: var(--text-color);
        border: 1px solid var(--border-color);
    }
</style>