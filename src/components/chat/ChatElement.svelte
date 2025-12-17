<script lang="ts">
    import type { ChatPreview, UserPublic } from "../../types/models";
    import { useQueryClient } from '@tanstack/svelte-query';
    import Avatar from "./Avatar.svelte";
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { presence } from '../../stores/presence';
    import { get } from 'svelte/store';
    import { formatLastSeen, isOlderThan } from '../../lib/datetime';
    import { ChatType } from '../../types/models';
    
    export let chat: ChatPreview;
    export let selected: boolean = false;

    const dispatch = createEventDispatcher<{ select: { chat: ChatPreview } }>();

    const queryClient = useQueryClient();
    const presenceStore = { subscribe: presence.subscribe };

    let isOnline = false;

    // TODO: change last_message on update from ws

    $: if (chat) {
        if (chat.chat_type === ChatType.DM) {
            const counterpartId = chat.other_user?.id as number | undefined ?? null;
            if (counterpartId) {
                const presenceData = get(presenceStore)[counterpartId];
                if (!presenceData || isOlderThan(presenceData.updatedAt, { minutes: 5 })) {
                    queryClient.invalidateQueries({ 
                        queryKey: ['presence', counterpartId] 
                    });
                }
            }
        }
    }

    let unsubscribePresence = () => {};
    
    onDestroy(() => {
        unsubscribePresence();
    });
    
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

    function handleClick() {
        dispatch('select', { chat });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            dispatch('select', { chat });
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
    <div class="avatar-wrapper">
        <Avatar avatarUrl={chat.other_user && chat.chat_type === "DM" ? chat.other_user.avatar_url : chat.avatar_url} />
        {#if chat.chat_type === ChatType.DM && isOnline}
            <span class="online-dot" aria-hidden="true"></span>
        {/if}
    </div>
    <div class="chat-info">
        <span class="chat-name">{chat.other_user && chat.chat_type === "DM" ? chat.other_user.name : chat.name}</span>
        <div class="last-message">
            {#if chat.last_message}
                {#if chat.last_user}
                    <span class="sender-name">{chat.last_user.name}: </span>
                {/if}
                {chat.last_message.content}
            {:else}
                <span class="last-message empty">Нет сообщений</span>
            {/if}
        </div>  
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
        background: var(--secondary-color);
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
        /* TODO: var */
        background: #2ecc71;
        border: 2px solid var(--secondary-color);
    }

    .sender-name {
        font-weight: 600;
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
