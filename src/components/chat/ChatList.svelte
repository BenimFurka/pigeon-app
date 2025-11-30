<script lang="ts">
    import { useChats } from '../../queries/chats';
    import ChatElement from './ChatElement.svelte';
    import type { Chat } from '../../types/models';
    import { createEventDispatcher } from 'svelte';
    
    // TODO: use events
    export let onSelect: (chat: Chat) => void; 

    export let selectedChatId: number | null = null;

    const chatsQuery = useChats();
    $: chatList = $chatsQuery?.data || [];
    $: isLoading = $chatsQuery?.isLoading;
    $: error = $chatsQuery?.error ? String($chatsQuery.error) : null;
</script>

<div class="list">
    {#if isLoading}
        <div class="loading">Загрузка чатов...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else if chatList.length === 0}
        <div class="empty">Нет чатов</div>
    {:else}
        {#each chatList as chat (chat.id)}
            <ChatElement 
                chat={chat}
                selected={selectedChatId === Number(chat.id)}
                {onSelect}
            />
        {/each}
    {/if}
</div>

<style>
    .list {
        display: flex;
        flex-direction: column;
        flex: 1 1 0%;
        min-height: 0; 
        overflow-y: auto;
        overflow-x: hidden;
        margin: 10px;
        color: var(--text-color);
        padding: 5px;
    }
    
    .loading, .error, .empty {
        padding: 20px;
        text-align: center;
        opacity: 0.6;
    }
    
    .error {
        color: #ff4d4d;
    }
</style>
