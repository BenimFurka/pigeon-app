<script lang="ts">
    import { useChats } from '../../queries/chats';
    import type { SearchResults } from '../../queries/search';
    import ChatElement from './ChatElement.svelte';
    import type { Chat, UserPublic } from '../../types/models';
    import { createEventDispatcher } from 'svelte';

    export let selectedChatId: number | null = null;
    export let searchQuery: string = '';
    export let searchResults: SearchResults | null = null;
    export let isSearchLoading: boolean = false;
    export let searchError: string | null = null;

    const chatsQuery = useChats();
    $: chatList = $chatsQuery?.data || [];
    $: isLoading = $chatsQuery?.isLoading;
    $: error = $chatsQuery?.error ? String($chatsQuery.error) : null;
    $: searchActive = searchQuery.trim().length >= 2;

    const dispatch = createEventDispatcher<{ select: { chat: Chat }; startDm: { user: UserPublic } }>();

    function handleSelect(event: CustomEvent<{ chat: Chat }>) {
        dispatch('select', event.detail);
    }

    function handleSearchChatSelect(chat: Chat) {
        dispatch('select', { chat });
    }

    function handleSearchUserSelect(user: UserPublic) {
        dispatch('startDm', { user });
    }

    function hasSearchResults(results: SearchResults | null): boolean {
        if (!results) return false;
        return Boolean(results.chats.length || results.users.length || results.messages.length);
    }
</script>

<div class="list">
    {#if searchActive}
        <div class="search-header">Результаты по запросу «{searchQuery}»</div>
        {#if isSearchLoading}
            <div class="loading">Поиск...</div>
        {:else if searchError}
            <div class="error">{searchError}</div>
        {:else if !hasSearchResults(searchResults)}
            <div class="empty">Ничего не найдено</div>
        {:else}
            {#if searchResults?.chats.length}
                <div class="search-group">
                    <div class="group-title">Чаты</div>
                    {#each searchResults.chats as chat (chat.id)}
                        <button
                            class={`search-card chat ${selectedChatId === Number(chat.id) ? 'active' : ''}`}
                            type="button"
                            on:click={() => handleSearchChatSelect(chat)}
                        >
                            <div class="card-header">
                                <span class="card-title">{chat.name || `Чат #${chat.id}`}</span>
                                <span class="badge">{chat.chat_type}</span>
                            </div>
                            {#if chat.description}
                                <div class="card-subtitle">{chat.description}</div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}

            {#if searchResults?.users.length}
                <div class="search-group">
                    <div class="group-title">Пользователи</div>
                    {#each searchResults.users as user (user.id)}
                        <button
                            class="search-card user"
                            type="button"
                            on:click={() => handleSearchUserSelect(user)}
                        >
                            <div class="card-header">
                                <span class="card-title">{user.name || user.username}</span>
                                {#if user.is_bot}
                                    <span class="badge alt">бот</span>
                                {/if}
                            </div>
                            <div class="card-subtitle muted">@{user.username}</div>
                        </button>
                    {/each}
                </div>
            {/if}

            {#if searchResults?.messages.length}
                <div class="search-group">
                    <div class="group-title">Сообщения</div>
                    {#each searchResults.messages as item (item.message.id)}
                        <button
                            class="search-card message"
                            type="button"
                            on:click={() => handleSearchChatSelect(item.chat)}
                        >
                            <div class="card-header">
                                <span class="card-title">{item.chat.name || `Чат #${item.chat.id}`}</span>
                                <span class="badge">{new Date(item.message.created_at).toLocaleString()}</span>
                            </div>
                            <div class="card-subtitle muted">
                                {item.sender.name || item.sender.username}: {item.message.content}
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        {/if}
    {:else}
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
                    on:select={handleSelect}
                />
            {/each}
        {/if}
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
    
    .search-header {
        padding: 10px 5px 0;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.6;
    }

    .search-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 12px 0;
    }

    .group-title {
        font-size: 0.9rem;
        font-weight: 600;
        opacity: 0.7;
        padding: 0 5px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .search-card {
        border: none;
        border-radius: var(--radius-md);
        background: rgba(0, 0, 0, 0.18);
        color: var(--text-color);
        padding: 12px;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
        transition: var(--transition);
    }

    .search-card:hover,
    .search-card.active {
        background: var(--glass);
    }

    .search-card.active {
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .card-title {
        font-weight: 600;
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .card-subtitle {
        font-size: 0.85rem;
        opacity: 0.75;
        line-height: 1.35;
    }

    .card-subtitle.muted {
        opacity: 0.6;
    }

    .badge {
        font-size: 0.72rem;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .badge.alt {
        background: rgba(255, 92, 143, 0.3);
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
