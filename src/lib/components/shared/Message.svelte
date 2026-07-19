<script lang="ts">
    import type { Message, ChatMember, MessageMedia } from '$lib/types/models';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import MessageMenu from '$lib/components/menus/MessageMenu.svelte';
    import MediaList from '$lib/components/media/MediaList.svelte';
    import ReactionList from '$lib/components/shared/ReactionList.svelte';
    import Textarea from '$lib/components/shared/Textarea.svelte';
    import { formatMessageTime } from '$lib/datetime';
    import { useProfile, useCurrentProfile } from '$lib/queries/profile';
    import { reactions } from '$lib/stores/reactions';
    import { readReceipts } from '$lib/stores/readReceipts';
    import { menuStore, menuActions } from '$lib/stores/menu';
    import { polls } from '$lib/stores/polls';
    import { pendingEditMessageId } from '$lib/stores/hotkeys';
    import { createEventDispatcher, onMount } from 'svelte';
    import type { UserPublic } from '$lib/types/models';
    import { wsService } from '$lib/ws-service';
    import { _, format } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';
    import { getMediaTypeName } from '$lib/utils/media';
    import { Check, CheckCheck } from 'lucide-svelte';
    import Clock from '$lib/components/icons/Clock.svelte';
    import { md, normalizeMarkdown } from '$lib/utils/markdown';
    
    // Props
    export let message: Message;
    export let showSender: boolean = true;
    export let groupPosition: string | 'single' | 'start' | 'middle' | 'end' = 'single';
    export let currentUserId: number | null = null;
    export let myMembership: ChatMember | undefined;
    export let replyToMessage: Message | null = null;
    export let chatId: number | null = null;

    // Event dispatcher
    const dispatch = createEventDispatcher();

    // State
    let sender: UserPublic | null = null;
    const profileQuery = useCurrentProfile();
    let replyToUser: UserPublic | null = null;
    let isEditing = false;
    let editContent = '';
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchDuration = 0;
    let isScrolling = false;
    let hasTouchEnded = false;
    let menuJustClosed = false;
    
    // Queries
    $: senderQuery = message.sender_id ? useProfile(message.sender_id, { enabled: !!message.sender_id && !isOwn }) : null;
    $: replyToUserQuery = replyToMessage?.sender_id ? useProfile(replyToMessage.sender_id, { enabled: !!replyToMessage?.sender_id }) : null;

    // Computed values
    $: isOwn = message.sender_id == currentUserId;
    $: isDeleted = false;
    $: lastReadByOther = chatId != null ? $readReceipts[chatId] ?? 0 : 0;
    $: isReadByOther = isOwn && message.id > 0 && lastReadByOther >= message.id;
    $: statusIcon = !isOwn ? null : message.status === 'sending' ? 'sending' : isReadByOther ? 'read' : 'sent';
    $: isMenuOpen = $menuStore.openMenu?.messageId === message.id;
    $: messageReactions = $reactions[message.id] || message.reactions || [];
    $: canReply = Boolean(myMembership?.can_send_messages);
    $: canEdit = isOwn;
    $: canDelete = isOwn || Boolean(myMembership?.can_manage_messages);
    $: timeStr = formatMessageTime(message.created_at, $format);
    $: hasMediaAttachments = hasMediaFiles(message.media || undefined);
    $: shouldExpandBubble = hasMediaAttachments || (message.media && message.media.length > 0);
    $: pollMedia = message.media?.find(m => m.type === 'Poll') as any;
    $: allowRevote = pollMedia?.allow_revote ?? false;
    $: hasVoted = currentUserId && $polls[message.id]?.hasVoted[currentUserId] || false;
    
    $: renderedContent = message.content ? (() => {
        const normalized = normalizeMarkdown(message.content);
        const processed = md.render(normalized).trim().replace(/<\/div>\s*\n/g, '</div>');
        return processed;
    })() : '';
    
    $: renderedReplyContent = replyToMessage?.content ? (() => {
        const normalized = normalizeMarkdown(replyToMessage.content);
        const processed = md.render(normalized).trim().replace(/<\/div>\s*\n/g, '</div>');
        return processed;
    })() : '';

    $: isServiceMessage = Boolean(
        message.new_chat_members ||
        message.left_chat_member ||
        message.new_chat_title ||
        message.delete_chat_photo ||
        message.chat_created_type ||
        message.migrate_to_chat_id ||
        message.migrate_from_chat_id ||
        message.pinned_message
    );
    $: serviceMessageText = getServiceMessageText();

    // Reactive statements
    $: if (senderQuery && $senderQuery?.data) {
        sender = $senderQuery.data;
    }
    $: if (isOwn && $profileQuery?.data) {
        sender = $profileQuery.data;
    }
    $: if (replyToUserQuery && $replyToUserQuery?.data) {
        replyToUser = $replyToUserQuery.data;
    }

    function hasMediaFiles(media: MessageMedia[] | undefined): boolean {
        if (!media || media.length === 0) return false;
        
        return media.some(item => {
            return item.type === 'Photo' || item.type === 'Video' || item.type === 'Gif';
        });
    }

    function isMobileDevice(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getServiceMessageText(): string {
        if (message.new_chat_members && message.new_chat_members.length > 0) {
            const names = message.new_chat_members.map(m => m.name || m.username).join(', ');
            return `${names} ${message.new_chat_members.length === 1 ? $_('message.joined') : $_('message.joined_plural')}`;
        }
        if (message.left_chat_member) {
            const name = message.left_chat_member.name || message.left_chat_member.username;
            return `${name} ${$_('message.left')}`;
        }
        if (message.new_chat_title) {
            return `${$_('message.chat_renamed')} "${message.new_chat_title}"`;
        }
        if (message.delete_chat_photo) {
            return $_('message.photo_removed');
        }
        if (message.chat_created_type) {
            return message.chat_created_type === 'group' ? $_('message.group_created') : $_('message.channel_created');
        }
        if (message.pinned_message) {
            return $_('message.pinned');
        }
        return message.content || '';
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

    // Event handlers
    function handleReplyClick() {
        dispatch('reply', { messageId: message.id, senderId: message.sender_id });
    }

    function handleAddReaction(emoji: string) {
        wsService.send({
            type: 'add_reaction',
            data: { message_id: message.id, emoji }
        });
    }

    function handleRemoveReaction(emoji: string) {
        if (currentUserId) {
            wsService.send({
                type: 'remove_reaction',
                data: { message_id: message.id, emoji }
            });
        }
    }

    function handleEdit() {
        isEditing = true;
        editContent = message.content || '';
    }

    // External edit request (e.g. ArrowUp hotkey for last own message)
    $: if ($pendingEditMessageId === message.id && canEdit && !isEditing) {
        handleEdit();
        pendingEditMessageId.set(null);
    }

    function handleEditKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSaveEdit();
        }
        if (event.key === 'Escape') handleCancelEdit();
    }

    function handleSaveEdit() {
        if (editContent.trim()) {
            wsService.send({
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
        if (confirm($_('message.delete_confirm'))) {
            wsService.send({
                type: 'delete_message',
                data: { message_id: message.id }
            });
        }
    }

    function handleUnvote() {
        wsService.unvotePoll(message.id);
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

    function handleSpoilerClick(e: MouseEvent | KeyboardEvent) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('spoiler')) {
            e.preventDefault();
            e.stopPropagation();
            target.classList.toggle('revealed');
        }
    }

    function openMenu(e: MouseEvent | TouchEvent) {
        e.preventDefault();
        
        if (isScrolling) {
            return;
        }
        
        const mediaViewer = document.querySelector('.media-viewer-backdrop');
        if (mediaViewer) {
            return;
        }
        
        if (e.type === 'contextmenu' && hasTouchEnded && touchDuration > 300) {
            return;
        }
        
        const target = e.target as Element;
        const preventMenuElement = target.closest('[data-prevent-menu]');
        if (preventMenuElement) {
            return;
        }
        
        let clientX: number, clientY: number;
        
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        
        menuActions.openMenu(message.id, clientX, clientY);
    }

    function handleClick(e: MouseEvent | TouchEvent) {
        if (isMobileDevice()) {
            return;
        }
        
        return;
    }

    function handleTouchStart(e: TouchEvent) {
        if (!isMobileDevice()) return;
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isScrolling = false;
        hasTouchEnded = false;
        menuJustClosed = false;
    }

    function handleTouchMove(e: TouchEvent) {
        if (!isMobileDevice()) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        if (deltaX > 15 || deltaY > 15) {
            isScrolling = true;
        }
    }

    function handleTouchEnd(e: TouchEvent) {
        if (!isMobileDevice()) return;
        
        hasTouchEnded = true;
        
        const touchEndTime = Date.now();
        touchDuration = touchEndTime - touchStartTime;
        
        const globalMenuJustClosed = (window as any).__menuJustClosed;
        
        if (menuJustClosed || globalMenuJustClosed) {
            return;
        }
        
        if (isScrolling) {
            return;
        }
        
        const mediaViewer = document.querySelector('.media-viewer-backdrop');
        if (mediaViewer) {
            return;
        }
        
        if (touchDuration > 300) {
            return;
        }
        
        const touch = e.changedTouches[0];
        const target = touch.target as Element;
        
        const currentMessage = e.currentTarget as Element;
        if (!currentMessage.contains(target)) {
            return;
        }
        
        const preventMenuElement = target.closest('[data-prevent-menu]');
        if (preventMenuElement) {
            return;
        }
        
        menuActions.openMenu(message.id, touch.clientX, touch.clientY);
    }
</script>

<svg width="0" height="0" style="position:absolute; width:0; height:0; overflow:hidden" aria-hidden="true" focusable="false">
    <symbol id="message-tail-filled" viewBox="0 0 11 20">
        <g transform="translate(9 -14)" fill="inherit" fill-rule="evenodd">
            <path d="M-6 16h6v17c-.193-2.84-.876-5.767-2.05-8.782-.904-2.325-2.446-4.485-4.625-6.48A1 1 0 01-6 16z" transform="matrix(1 0 0 -1 0 49)" id="corner-fill" fill="inherit"></path>
        </g>
    </symbol>
</svg>

<div class="message {isOwn ? 'own' : 'other'} {groupPosition} {isDeleted ? 'deleted' : ''} {isServiceMessage ? 'service' : ''}"
     data-message-id={message.id}
     data-sender-id={message.sender_id}
     data-timestamp={message.created_at}
     on:contextmenu={openMenu}
     on:click={handleClick}
     on:touchstart={handleTouchStart}
     on:touchmove={handleTouchMove}
     on:touchend={handleTouchEnd}
     role="presentation">

    {#if isServiceMessage}
        <div class="service-message">
            <span class="service-text">{serviceMessageText}</span>
        </div>
    {:else}
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
                <div class="edit-container" data-prevent-menu>
                    {#if message.media && message.media.length > 0}
                        <div class="edit-media">
                            <MediaList media={message.media} {isOwn} {currentUserId} {message} />
                        </div>
                    {/if}
                    <Textarea
                        bind:value={editContent}
                        class="edit-input"
                        rows={1}
                        on:keydown={handleEditKeyDown}
                    />
                    <div class="edit-actions">
                        <button class="edit-btn save" data-prevent-menu on:click|stopPropagation={handleSaveEdit}>{$_('message.save')}</button>
                        <button class="edit-btn cancel" data-prevent-menu on:click|stopPropagation={handleCancelEdit}>{$_('message.cancel')}</button>
                    </div>
                </div>
            {:else if isDeleted}
                <div class="content deleted">
                    <em>{$_('message.deleted')}</em>
                </div>
            {:else}
                <div class="content bubble {shouldExpandBubble ? 'has-attachments' : ''} {hasMediaAttachments ? 'has-media' : ''}">
                {#if message.reply_to_message_id && replyToMessage}
                    <button 
                        class="reply-preview" 
                        data-prevent-menu
                        on:click|stopPropagation={() => dispatch('scrollTo', { messageId: replyToMessage.id })}
                        on:keydown={(e) => e.key === 'Enter' && dispatch('scrollTo', { messageId: replyToMessage.id })}
                        type="button"
                    >
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
                        <div class="reply-content-container">
                            <div class="reply-indicator">
                                {replyToMessage.sender_id === currentUserId ? $_('message.you') : (replyToUser?.name || replyToUser?.username || $_('member_list.user'))}
                            </div>
                            <div class="reply-content">
                                {#if replyToMessage.media && replyToMessage.media.length > 0}
                                    <em class="attachment-type">{getMediaTypeName(replyToMessage.media[0], $_)}</em>
                                    {#if replyToMessage.content} <span class="reply-text-content">{@html renderedReplyContent}</span>{/if}
                                {:else}
                                    <span class="reply-text-content">{@html renderedReplyContent}</span>
                                {/if}
                            </div>
                        </div>
                    </button>
                {/if}
                
                {#if message.media && message.media.length > 0}
                    <MediaList media={message.media} {isOwn} {currentUserId} {message} />
                {/if}
                
                
                <div class="message-row">
                    {#if message.content}
                        <div class="message-text" role="button" tabindex="0" on:click|stopPropagation={handleSpoilerClick} on:keydown={(e) => e.key === 'Enter' && handleSpoilerClick(e)}>{@html renderedContent}</div>
                    {/if}
                    
                    {#if !(messageReactions && messageReactions.length > 0)}
                        <div class="bubble-footer">
                            {#if message.edited_at}
                                <span class="edited-time" title={$format('message.edited_at', { values: { date: new Date(message.edited_at).toLocaleString() } })}>
                                    {$_('message.edited')}
                                </span>
                            {/if}
                            <span class="time">{timeStr}</span>
                            {#if statusIcon === 'sending'}
                                <span class="status-icon" title={$_('message.sending')}><Clock infinite={true} size={14} /></span>
                            {:else if statusIcon === 'sent'}
                                <span class="status-icon" title={$_('message.sent')}><Check size={14} /></span>
                            {:else if statusIcon === 'read'}
                                <span class="status-icon read" title={$_('message.read')}><CheckCheck size={14} /></span>
                            {/if}
                        </div>
                    {/if}
                </div>
                
                {#if messageReactions && messageReactions.length > 0}
                    <div class="reactions-footer-row">
                        <ReactionList 
                            reactions={messageReactions} 
                            {currentUserId} 
                            isOwnMessage={isOwn}
                            messageId={message.id}
                            on:addReaction={(e) => { handleAddReaction(e.detail.emoji); }}
                            on:removeReaction={(e) => { handleRemoveReaction(e.detail.emoji); }}
                        />
                        
                        <div class="bubble-footer">
                            {#if message.edited_at}
                                <span class="edited-time" title={$format('message.edited_at', { values: { date: new Date(message.edited_at).toLocaleString() } })}>
                                    {$_('message.edited')}
                                </span>
                            {/if}
                            <span class="time">{timeStr}</span>
                            {#if statusIcon === 'sending'}
                                <span class="status-icon" title={$_('message.sending')}><Clock infinite={true} size={14} /></span>
                            {:else if statusIcon === 'sent'}
                                <span class="status-icon" title={$_('message.sent')}><Check size={14} /></span>
                            {:else if statusIcon === 'read'}
                                <span class="status-icon read" title={$_('message.read')}><CheckCheck size={14} /></span>
                            {/if}
                        </div>
                    </div>
                {/if}
                

                {#if groupPosition === 'single' || groupPosition === 'end'}
                    <svg class="bubble-tail" viewBox="0 0 11 20" width="11" height="20" aria-hidden="true" focusable="false">
                        <use href="#message-tail-filled" />
                    </svg>
                {/if}
            </div>
        {/if}

        </div>
    {/if}
</div>

{#if isMenuOpen && !isDeleted}
    <MessageMenu
        x={$menuStore.openMenu?.x || 0}
        y={$menuStore.openMenu?.y || 0}
        isOpen={true}
        canReply={canReply}
        canEdit={canEdit}
        canDelete={canDelete}
        messageId={message.id}
        {currentUserId}
        existingReactions={messageReactions}
        {allowRevote}
        {hasVoted}
        on:close={menuActions.closeMenu}
        on:reply={() => { menuActions.closeMenu(); handleReplyClick(); }}
        on:edit={() => { menuActions.closeMenu(); handleEdit(); }}
        on:copy={() => { menuActions.closeMenu(); handleCopy(); }}
        on:delete={() => { menuActions.closeMenu(); handleDelete(); }}
        on:unvote={() => { menuActions.closeMenu(); handleUnvote(); }}
        on:addReaction={(e) => { handleAddReaction(e.detail.emoji); }}
        on:removeReaction={(e) => { handleRemoveReaction(e.detail.emoji); }}
    />
{/if}

<style>
    .message {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        position: relative;
    }

    .message.other {
        padding-left: 44px;
    }

    .message.own {
        padding-right: 44px;
    }

    .message.other:has(.avatar-wrapper) {
        padding-left: 4px;
    }

    .message.own:has(.avatar-wrapper) {
        padding-right: 4px;
    }

    .message:hover {
        background: rgba(0, 0, 0, 0.08);
    }

    .message.own { flex-direction: row-reverse; }

    .message:is(.middle, .end) .sender {
        display: none;
    }

    .message.service {
        padding: 8px 0 8px 0;
        justify-content: center;
    }

    .message.service:hover {
        background: transparent;
    }

    .service-message {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 4px 12px;
        background: var(--color-bg-elevated);
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 500;
        color: var(--color-text);
        opacity: 0.8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .service-text {
        font-weight: 500;
    }

    .message-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    
    .sender {
        font-weight: 600;
        font-size: 0.85em;
        color: var(--color-text);
        margin-bottom: 4px;
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
    
    .reply-text-content {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
        height: 1em;
    }
    
    .reply-text-content :global(*) {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
    }
    
    .reply-text-content :global(p) {
        display: inline;
        margin: 0;
    }
    
    .reply-text-content :global(h1),
    .reply-text-content :global(h2),
    .reply-text-content :global(h3),
    .reply-text-content :global(h4),
    .reply-text-content :global(h5),
    .reply-text-content :global(h6) {
        display: inline;
        margin: 0;
        font-size: 1em;
        font-weight: 600;
    }
    
    .reply-text-content :global(ul),
    .reply-text-content :global(ol) {
        display: inline;
        margin: 0;
        padding: 0;
    }
    
    .reply-text-content :global(li) {
        display: inline;
        margin: 0;
    }
    
    .reply-text-content :global(code) {
        background: rgba(0, 0, 0, 0.2);
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 0.9em;
    }
    
    .reply-text-content :global(blockquote) {
        display: inline;
        margin: 0;
        padding: 0;
        border: none;
    }
    
    .reply-text-content :global(table) {
        display: inline;
        margin: 0;
        padding: 0;
        border: none;
    }
    
    .reply-text-content :global(tr),
    .reply-text-content :global(td),
    .reply-text-content :global(th) {
        display: inline;
        margin: 0;
        padding: 0;
        border: none;
    }
    
    .reply-text-content :global(img) {
        display: inline;
        max-height: 1em;
        vertical-align: middle;
    }

    .content {
        white-space: pre-line;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4; 
    }

    .bubble {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        align-items: flex-end;
        position: relative;
        max-width: min(100%, 480px);
        padding: 6px 10px 4px 10px;
        line-height: 1.2;
        background: var(--bubble-bg, rgba(255,255,255,0.06));
        min-width: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .bubble.has-media {
        padding: 0;
    }

    .bubble.has-media :global(.media-list) {
        margin-bottom: 0;
        gap: 0;
    }

    .bubble.has-media :global(.visual-media-group) {
        width: 100%;
        border-radius: 0;
    }

    .bubble.has-media :global(.other-media-group) {
        width: 100%;
        gap: 0;
    }

    .bubble.has-media :global(.poll-container) {
        border-radius: 0;
    }

    .bubble.has-media :global(.reply-preview) {
        padding: 4px 8px;
        margin: 6px;
        margin-bottom: 6px;
    }

    .bubble.has-media :global(.message-text) {
        padding: 6px 10px 4px 10px;
    }

    .bubble.has-media :global(.bubble-footer) {
        padding: 0 10px 4px 10px;
    }

    .bubble.has-media :global(.reactions-footer-row) {
        padding: 0;
    }

    .bubble.has-media :global(.reactions-footer-row) :global(.reactions) {
        padding: 0 10px 4px 10px;
    }
    
    .message.own .bubble {
        max-width: min(calc(100% - 20px), 480px);
    }
    
    .message.other .bubble {
        max-width: min(calc(100% - 20px), 480px);
    }
    
    .message.own:has(.avatar-wrapper) .bubble {
        max-width: min(calc(100% - 20px), 480px);
    }
    
    .message.other:has(.avatar-wrapper) .bubble {
        max-width: min(calc(100% - 20px), 480px);
    }
    
    .bubble.has-media {
        max-width: min(calc(100% - 20px), 800px);
        min-width: 100px;
        width: fit-content;
    }
    
    .message.own:has(.avatar-wrapper) .bubble.has-attachments {
        max-width: min(calc(100% - 20px), 85%);
    }
    
    .message.other:has(.avatar-wrapper) .bubble.has-attachments {
        max-width: min(calc(100% - 20px), 85%);
    }
    
    .message.own:has(.avatar-wrapper) .bubble.has-media {
        max-width: min(calc(100% - 12px), 800px);
    }

    .message.other:has(.avatar-wrapper) .bubble.has-media {
        max-width: min(calc(100% - 12px), 800px);
    }
 
    .other .bubble { --bubble-bg: var(--color-bg-elevated); }
    .own .bubble { --bubble-bg: var(--color-accent); }
    
    .other .bubble { margin-right: auto; }
    .own .bubble { margin-left: auto; }

    .message.other:is(.single) .bubble {  border-radius: 15px 15px 15px 0px;}
    .message.own:is(.single) .bubble { border-radius: 15px 15px 0px 15px; }
    
    .message.other:is(.end) .bubble {  border-radius: 5px 15px 15px 0px;}
    .message.own:is(.end) .bubble { border-radius: 15px 5px 0px 15px; }

    .message.own:is(.start) .bubble {  border-radius: 15px 15px 5px 15px;}
    .message.other:is(.start) .bubble {  border-radius: 15px 15px 15px 5px;}

    .message.other:is(.middle) .bubble {  border-radius: 5px 15px 15px 5px;}
    .message.own:is(.middle) .bubble {  border-radius: 15px 5px 5px 15px;}

    .bubble-footer {
        flex: 0 0 auto;
        margin-left: auto;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7em;
        opacity: 0.7;
        margin-top: auto;
    }

    .status-icon {
        display: inline-flex;
        opacity: 0.85;
    }
    .status-icon.read {
        opacity: 1;
    }

    .edited-time {
        margin-top: auto;
    }

    .message-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        width: 100%;
    }

    .reactions-footer-row {
        align-items: center;
        display: flex;
        width: 100%;
        justify-content: space-between;
        gap: 8px;
    }

    .bubble-tail {
        position: absolute;
        width: 11px;
        height: 20px;
        bottom: -1px;
        pointer-events: none;
        fill: var(--bubble-bg, rgba(255,255,255,0.06));
        shape-rendering: geometricPrecision;
    }

    .message.own:is(.single, .end) .bubble-tail {
        right: -8px;
        transform: scaleX(-1);
    }

    .message.other:is(.single, .end) .bubble-tail {
        left: -8px;
    }

    .edit-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: min(100%, 480px);
        padding: 8px;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-accent);
        border-radius: var(--radius-sm);
    }

    .edit-media {
        max-width: 100%;
        overflow: hidden;
        border-radius: var(--radius-sm);
        opacity: 0.95;
    }

    .edit-media :global(.media-list) {
        pointer-events: none;
    }
    
    .edit-input {
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        padding: 8px;
        color: var(--color-text);
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
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
        flex: 1 1 auto;
        min-width: 0;
        margin-right: 10px;
        word-wrap: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
    }
    
    .message-text :global(p) {
        margin: 0;
        display: inline;
    }
    
    .message-text :global(p:not(:last-child)) {
        margin-right: 0.5em;
    }
    
    .message-text :global(.code-block) {
        margin: 4px 0;
        border-radius: 6px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 100%;
    }
    
    .message-text :global(.code-header) {
        background: rgba(0, 0, 0, 0.5);
        color: rgba(255, 255, 255, 0.7);
        padding: 4px 12px;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .message-text :global(.code-content) {
        display: flex;
        flex-direction: column;
    }
    
    .message-text :global(.code-line) {
        display: flex;
        align-items: flex-start;
    }
    
    .message-text :global(.line-number) {
        background: rgba(0, 0, 0, 0.4);
        color: rgba(255, 255, 255, 0.4);
        padding: 0 8px;
        font-size: 0.85em;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        line-height: 1.4;
        text-align: right;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        user-select: none;
        min-width: 2.0em;
        flex-shrink: 0;
        align-self: stretch;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding-top: 0;
        padding-bottom: 0;
    }
    
    .message-text :global(.line-content) {
        background: transparent;
        padding: 0 12px;
        font-size: 0.85em;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        word-break: break-word;
        flex: 1;
        min-width: 0;
    }
    
    .message-text :global(code) {
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.9em;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
    }
    
    .message-text :global(.line-content code) {
        background: none;
        padding: 0;
        font-size: inherit;
        line-height: inherit;
    }

    .message-text :global(hr) {
        display: block;
        width: 100%;
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.25);
        margin: 0.6em 0;
        height: 0;
    }

    .message-text :global(pre) {
        display: block;
        max-width: 100%;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .message-text :global(table) {
        display: block;
        max-width: 100%;
        overflow-x: auto;
        border-collapse: collapse;
        margin: 0.4em 0;
        font-size: 0.9em;
    }

    .message-text :global(th),
    .message-text :global(td) {
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 4px 8px;
        text-align: left;
    }

    .message-text :global(th) {
        font-weight: 600;
        background: rgba(0, 0, 0, 0.2);
    }

    .message-text :global(img) {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
    }
    
    .message-text :global(.hljs-keyword) {
        color: #ff79c6;
        font-weight: bold;
    }
    
    .message-text :global(.hljs-string) {
        color: #f1fa8c;
    }
    
    .message-text :global(.hljs-number) {
        color: #bd93f9;
    }
    
    .message-text :global(.hljs-comment) {
        color: #6272a4;
        font-style: italic;
    }
    
    .message-text :global(.hljs-function) {
        color: #50fa7b;
    }
    
    .message-text :global(.hljs-variable) {
        color: #8be9fd;
    }
    
    .message-text :global(.hljs-tag) {
        color: #ff79c6;
    }
    
    .message-text :global(.hljs-attribute) {
        color: #50fa7b;
    }
    
    .message-text :global(.spoiler) {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
        padding: 2px 4px;
        cursor: pointer;
        transition: background 0.2s;
        user-select: none;
        color: transparent;
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
    }
    
    .message-text :global(.spoiler:hover) {
        background: rgba(0, 0, 0, 0.4);
    }
    
    .message-text :global(.spoiler.revealed) {
        background: transparent;
        user-select: auto;
        color: inherit;
        text-shadow: none;
    }
    
    .message-text :global(h1),
    .message-text :global(h2),
    .message-text :global(h3),
    .message-text :global(h4),
    .message-text :global(h5),
    .message-text :global(h6) {
        margin: 0.5em 0 0.25em 0;
        font-weight: 600;
        line-height: 1.3;
    }
    
    .message-text :global(h1) { font-size: 1.5em; }
    .message-text :global(h2) { font-size: 1.3em; }
    .message-text :global(h3) { font-size: 1.15em; }
    .message-text :global(h4) { font-size: 1.05em; }
    .message-text :global(h5) { font-size: 0.95em; }
    .message-text :global(h6) { font-size: 0.85em; }
    
    .message-text :global(ul),
    .message-text :global(ol) {
        margin: 0 !important;
        padding-left: 1.5em !important;
    }

    .message-text :global(li) {
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1.4;
    }
    
    .message-text :global(ul li) {
        list-style-type: disc;
    }
    
    .message-text :global(ol li) {
        list-style-type: decimal;
    }
    
    .message-text :global(blockquote) {
        margin: 0.5em 0;
        padding-left: 1em;
        border-left: 3px solid rgba(255, 255, 255, 0.3);
        opacity: 0.8;
    }
    
    .message-text :global(a) {
        color: inherit;
        text-decoration: underline;
        opacity: 0.9;
    }
    
    .message-text :global(a:hover) {
        opacity: 1;
    }

    .own * {
        color: var(--color-button-text);
    }   

    .other * {
        color: var(--color-text);
    }
    
    .avatar-wrapper {
        flex-shrink: 0;
    }
    
    .avatar-spacer {
        width: 32px;
        flex-shrink: 0;
    }
    
    .message-avatar {
        width: 32px !important;
        height: 32px !important;
    }
    
    @media (max-width: 768px) {
        .bubble.has-media {
            max-width: min(98%, 600px);
            min-width: 80px;
            width: fit-content;
        }
    }

    @media (max-width: 480px) {
        .bubble.has-attachments,
        .bubble.has-media {
            max-width: min(100%, 500px);
            min-width: 60px;
            width: fit-content;
        }
    }
</style>
