<script lang="ts">
    import type { Message, ChatMember, MessageAttachment } from '$lib/types/models';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import MessageMenu from '$lib/components/menus/MessageMenu.svelte';
    import AttachmentList from '$lib/components/media/AttachmentList.svelte';
    import ReactionList from '$lib/components/shared/ReactionList.svelte';
    import { formatMessageTime } from '$lib/datetime';
    import { useProfile } from '$lib/queries/profile';
    import { reactions } from '$lib/stores/reactions';
    import { readReceipts } from '$lib/stores/readReceipts';
    import { menuStore, menuActions } from '$lib/stores/menu';
    import { createEventDispatcher, onMount } from 'svelte';
    import type { UserPublic } from '$lib/types/models';
    import { session } from '$lib/session';
    import { _ } from 'svelte-i18n';
    import { format } from 'svelte-i18n';
    import { getServerUrl } from '$lib/config';
    import {Check, CheckCheck } from 'lucide-svelte';
    import Clock from '$lib/components/icons/Clock.svelte';
    import MarkdownIt from 'markdown-it';
    import hljs from 'highlight.js';

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
    
    // Markdown parser
    const md = new MarkdownIt({
        html: false,
        linkify: true,
        typographer: false,
        breaks: false,
        xhtmlOut: false,
    });
    
    md.renderer.rules.fence = function(tokens: any[], idx: number, options: any, env: any) {
        const token = tokens[idx];
        const info = token.info ? token.info.trim() : '';
        const lang = info.split(' ')[0];
        let content = token.content || '';
        
        content = content.replace(/\n+$/, '');
        
        const lines = content.split('\n');
        
        if (lang && hljs.getLanguage(lang)) {
            try {
                const highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
                const highlightedLines = highlighted.split('\n');
                const langDisplay = lang.toUpperCase();
                
                let codeHtml = '';
                for (let i = 0; i < lines.length; i++) {
                    const lineNumber = i + 1;
                    const highlightedLine = highlightedLines[i] || '';
                    codeHtml += `<div class="code-line"><span class="line-number">${lineNumber}</span><span class="line-content">${highlightedLine}</span></div>`;
                }
                
                return `<div class="code-block"><div class="code-header">${langDisplay}</div><div class="code-content">${codeHtml}</div></div>\n`;
            } catch (__) {}
        }
        
        const highlighted = hljs.highlightAuto(content).value;
        const highlightedLines = highlighted.split('\n');
        const langDisplay = 'TEXT';
        
        let codeHtml = '';
        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const highlightedLine = highlightedLines[i] || '';
            codeHtml += `<div class="code-line"><span class="line-number">${lineNumber}</span><span class="line-content">${highlightedLine}</span></div>`;
        }
        
        return `<div class="code-block"><div class="code-header">${langDisplay}</div><div class="code-content">${codeHtml}</div></div>\n`;
    };

    md.renderer.rules.text = function(tokens: any[], idx: number) {
        let content = tokens[idx].content;
        content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        content = content.replace(/\n/g, '<br>');
        content = content.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>');
        return content;
    };

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
    $: hasMediaAttachments = hasMediaFiles(message.attachments || undefined);
    $: shouldExpandBubble = hasMediaAttachments || (message.attachments && message.attachments.length > 0);
    $: renderedContent = message.content ? (() => {
        const normalized = normalizeMarkdown(message.content);
        const processed = md.render(normalized).trim().replace(/<\/div>\s*\n/g, '</div>');
        return processed;
    })() : '';

    // Reactive statements
    $: if (senderQuery && $senderQuery?.data) {
        sender = $senderQuery.data;
    }
    $: if (replyToUserQuery && $replyToUserQuery?.data) {
        replyToUser = $replyToUserQuery.data;
    }

    // Utility functions
    function normalizeMarkdown(text: string): string {
        if (!text) return text;
        
        const lines = text.split('\n');
        const newLines: string[] = [];
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmed = line.trim();

            if (!inCodeBlock) {
                if (trimmed.startsWith('```')) {
                    inCodeBlock = true;
                    newLines.push(line);
                } else {
                    newLines.push(line);
                }
            } else {
                if (trimmed === '```') {
                    inCodeBlock = false;
                    newLines.push(line);
                    if (i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
                        newLines.push('');
                    }
                } else if (line.includes('```')) {
                    const idx = line.indexOf('```');
                    const before = line.substring(0, idx);
                    const after = line.substring(idx + 3);

                    if (before.length > 0) {
                        newLines.push(before);
                    }

                    newLines.push('```');
                    inCodeBlock = false;

                    const afterTrimmed = after.trimStart();
                    if (afterTrimmed.startsWith('```')) {
                        newLines.push('');
                        newLines.push(afterTrimmed);
                        inCodeBlock = true;
                    } else if (afterTrimmed.length > 0) {
                        newLines.push(afterTrimmed);
                    }

                    if (i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
                        const last = newLines[newLines.length - 1];
                        if (last !== '' && !last.trim().startsWith('```')) {
                            newLines.push('');
                        }
                    }
                } else {
                    newLines.push(line);
                }
            }
        }

        const result: string[] = [];
        for (let i = 0; i < newLines.length; i++) {
            result.push(newLines[i]);
            if (i < newLines.length - 1) {
                const current = newLines[i].trim();
                const next = newLines[i + 1].trim();
                if (current === '```' && next.startsWith('```') && newLines[i + 1] !== '') {
                    result.push('');
                }
            }
        }

        return result.join('\n');
    }

    function hasMediaFiles(attachments: MessageAttachment[] | undefined): boolean {
        if (!attachments || attachments.length === 0) return false;
        
        return attachments.some(attachment => {
            const mimeType = attachment.mime_type?.toLowerCase() || '';
            const fileType = attachment.file_type?.toLowerCase() || '';
            
            return fileType === 'image' || fileType === 'gif' || fileType === 'video' ||
                   mimeType.startsWith('image/') || mimeType.startsWith('video/') ||
                   fileType === 'gif' || mimeType.includes('gif');
        });
    }

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

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getAttachmentTypeName(attachment: MessageAttachment): string {
        const type = getAttachmentType(attachment);
        return $_(`common.attachmentTypes.${type}`);
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
        const ws = session.getWebSocket();
        if (ws) {
            ws.send({
                type: 'add_reaction',
                data: { message_id: message.id, emoji }
            });
        }
    }

    function handleRemoveReaction(emoji: string) {
        const ws = session.getWebSocket();
        if (ws && currentUserId) {
            ws.send({
                type: 'remove_reaction',
                data: { message_id: message.id, emoji }
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
        if (confirm($_('message.delete_confirm'))) {
            const ws = session.getWebSocket();
            if (ws) {
                ws.send({
                    type: 'delete_message',
                    data: { message_id: message.id }
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
        
        if (e.type === 'contextmenu' && hasTouchEnded && touchDuration > 300) {
            return;
        }
        
        const target = e.target as Element;
        const interactiveElement = target.closest('button, .reply-preview, .reactions-footer-row, .reaction-item, .time, .status-icon, .spoiler, a, .edit-container, .edit-textarea');
        if (interactiveElement) {
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
        
        if (deltaX > 10 || deltaY > 10) {
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
        
        if (touchDuration > 300) {
            return;
        }
        
        const touch = e.changedTouches[0];
        const target = touch.target as Element;
        
        const currentMessage = e.currentTarget as Element;
        if (!currentMessage.contains(target)) {
            return;
        }
        
        const modalElement = target.closest('[role="dialog"], .modal, .overlay, .backdrop');
        if (modalElement) {
            return;
        }
        
        const attachmentElement = target.closest('.attachment-container');
        if (attachmentElement) {
            return;
        }
        
        const interactiveElement = target.closest('button, .reply-preview, .reactions-footer-row, .reaction-item, .time, .status-icon, .spoiler, a, .edit-container, .edit-textarea');
        if (interactiveElement) {
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

<div class="message {isOwn ? 'own' : 'other'} {groupPosition} {isDeleted ? 'deleted' : ''}"
     data-message-id={message.id}
     data-sender-id={message.sender_id}
     data-timestamp={message.created_at}
     on:contextmenu={openMenu}
     on:click={handleClick}
     on:touchstart={handleTouchStart}
     on:touchmove={handleTouchMove}
     on:touchend={handleTouchEnd}
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
                    <button class="edit-btn save" on:click={handleSaveEdit}>{$_('message.save')}</button>
                    <button class="edit-btn cancel" on:click={handleCancelEdit}>{$_('message.cancel')}</button>
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
                                {/if}
                            </div>
                        {/if}
                        <div class="reply-content-container">
                            <div class="reply-indicator">
                                {replyToMessage.sender_id === currentUserId ? $_('message.you') : (replyToUser?.name || replyToUser?.username || $_('member_list.user'))}
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
                
                
                <div class="message-row">
                    {#if message.content}
                        <div class="message-text" role="button" tabindex="0" on:click={handleSpoilerClick} on:keydown={(e) => e.key === 'Enter' && handleSpoilerClick(e)}>{@html renderedContent}</div>
                    {/if}
                    
                    {#if !(messageReactions && messageReactions.length > 0)}
                        <div class="bubble-footer">
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
        on:close={menuActions.closeMenu}
        on:reply={() => { menuActions.closeMenu(); handleReplyClick(); }}
        on:edit={() => { menuActions.closeMenu(); handleEdit(); }}
        on:copy={() => { menuActions.closeMenu(); handleCopy(); }}
        on:delete={() => { menuActions.closeMenu(); handleDelete(); }}
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
    
    .message:is(.middle, .end) .sender {
        display: none;
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
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        align-items: flex-end;
        position: relative;
        max-width: 60%;
        padding: 6px 10px 4px 10px;
        line-height: 1.2;
        background: var(--bubble-bg, rgba(255,255,255,0.06));
        min-width: 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    .bubble.has-attachments {
        max-width: 85%;
        min-width: 200px;
        width: fit-content;
    }
    
    .bubble.has-media {
        max-width: 90%;
        min-width: 220px;
        width: fit-content;
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
        overflow-wrap: break-word;
        flex: 1;
    }
    
    .message-text :global(code) {
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.9em;
    }
    
    .message-text :global(.line-content code) {
        background: none;
        padding: 0;
        font-size: inherit;
        line-height: inherit;
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
        .bubble.has-attachments {
            max-width: 95%;
            min-width: 180px;
            width: fit-content;
        }
        
        .bubble.has-media {
            max-width: 98%;
            min-width: 200px;
            width: fit-content;
        }
    }
    
    @media (max-width: 480px) {
        .bubble.has-attachments,
        .bubble.has-media {
            max-width: 100%;
            min-width: 160px;
            width: fit-content;
        }
    }
</style>
