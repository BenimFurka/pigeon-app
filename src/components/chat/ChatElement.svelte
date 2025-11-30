<script lang="ts">
    import type { Chat } from "../../types/models";
    import { useProfile } from "../../queries/profile";
    import { useMessages } from "../../queries/messages";
    import Avatar from "./Avatar.svelte";
    import { createEventDispatcher } from 'svelte';
    
    export let chat: Chat;
    export let selected: boolean = false;
     
    // TODO: Use events
    export let onSelect: (chat: Chat) => void = () => {};
    
    let lastMessageText = '';
    let lastSenderName = '';
    let lastSenderId: number | null = null;
    $: senderQuery = lastSenderId ? useProfile(lastSenderId, { enabled: !!lastSenderId }) : null;
    $: if (senderQuery && $senderQuery?.data) {
        const p = $senderQuery.data;
        lastSenderName = p.name || p.username || '';
    }
    
    $: msgsQuery = chat?.id ? useMessages(Number(chat.id), { enabled: !!chat?.id }) : null;
    $: {
        const data = msgsQuery ? $msgsQuery?.data : [];
        if (data && data.length > 0) {
            const lastMsg = data[data.length - 1];
            lastSenderId = lastMsg.sender_id || null;
        } else {
            lastMessageText = '';
            lastSenderName = '';
            lastSenderId = null;
        }
    }
    
    function handleClick() {
        onSelect(chat);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(chat);
        }
    }
</script>

<div 
    class="chat-element no-text-select {selected ? 'selected' : ''}" 
    role="button" 
    tabindex="0"
    on:click={handleClick}
    on:keydown={handleKeydown}
>
    <Avatar id={chat.owner_id || chat.id} />
    <div class="chat-info">
        <span class="chat-name">{chat.name || `Чат #${chat.id}`}</span>
        {#if lastMessageText}
            <span class="last-message">
                {#if lastSenderName}
                    {lastSenderName}: 
                {/if}
                {lastMessageText}
            </span>
        {:else}
            <span class="last-message empty">Нет сообщений</span>
        {/if}
    </div>
</div>

<style>
    .chat-element {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        cursor: pointer;
        border-radius: 8px;
        opacity: 0.85;
        margin: 5px;
        transition: var(--transition);
        min-height: 60px;
        max-height: 60px;
        height: auto;
        box-sizing: border-box;
        width: calc(100% - 20px);
        max-width: 100%;
        overflow: hidden;
        outline: none;
    }

    .chat-element:hover {
        opacity: 1;
        background: var(--glass);
    }
    
    .chat-element.selected {
        opacity: 1;
        background: var(--primary-color);
    }

    .chat-info {
        display: flex;
        flex-direction: column;
        white-space: nowrap;
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }
        
    .chat-name {
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }
    
    .last-message {
        color: var(--text-color);
        opacity: 0.7;
        font-size: 0.8em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        box-sizing: border-box;
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
