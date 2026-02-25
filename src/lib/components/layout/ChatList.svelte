<script lang="ts">
    import { useChats } from '$lib/queries/chats';
    import type { SearchResults } from '$lib/queries/search';
    import ChatElement from '$lib/components/shared/ChatElement.svelte';
    import { ChatType, type ChatPreview, type UserPublic } from '$lib/types/models';
    import { createEventDispatcher, onMount } from 'svelte';
    import { chatNavigationTarget, clearChatOpenRequest } from '$lib/stores/chatNavigation';
    import { _ } from 'svelte-i18n';

    // Props
    export let selectedChatId: number | null = null;
    export let searchQuery: string = '';
    export let searchResults: SearchResults | null = null;
    export let isSearchLoading: boolean = false;
    export let searchError: string | null = null;

    // Event dispatcher
    const dispatch = createEventDispatcher<{ select: { chat: ChatPreview }; startDm: { user: UserPublic } }>();

    // Queries and stores
    const chatsQuery = useChats();

    // State
    let pendingChatId: number | null = null;
    let lastHandledRequestId = 0;

    // Computed values
    $: chatList = Array.from(
        new Map(
            ($chatsQuery?.data || []).map(chat => [chat.id, chat])
        ).values()
    ).sort((a, b) => {
        const aTime = new Date(a.last_message?.created_at || 0).getTime();
        const bTime = new Date(b.last_message?.created_at || 0).getTime();
        return bTime - aTime;
    });
    $: isLoading = $chatsQuery?.isLoading;
    $: error = $chatsQuery?.error ? String($chatsQuery.error) : null;
    $: searchActive = searchQuery.trim().length >= 2;

    // Reactive statements
    $: if (pendingChatId !== null && chatList.length) {
        trySelectChatById(pendingChatId);
    }

    // Lifecycle hooks
    onMount(() => {
        const unsubscribeNavigation = chatNavigationTarget.subscribe((request) => {
            if (!request) {
                return;
            }

            if (request.requestId === lastHandledRequestId) {
                return;
            }

            lastHandledRequestId = request.requestId;
            const { chatId } = request;
            if (typeof chatId !== 'number') {
                return;
            }

            pendingChatId = chatId;
            trySelectChatById(chatId);
        });
        return () => {
            unsubscribeNavigation?.();
        };
    });

    // Event handlers
    function handleSelect(event: CustomEvent<{ chat: ChatPreview }>) {
        dispatch('select', event.detail);
    }

    function handleSearchChatSelect(chat: ChatPreview) {
        dispatch('select', { chat });
    }

    function handleSearchUserSelect(user: UserPublic) {
        const existing = chatList.find(
            (c) => c.chat_type === ChatType.DM && c.other_user?.id === user.id
        );
        if (existing) {
            dispatch('select', { chat: existing });
        } else {
            dispatch('startDm', { user });
        }
    }

    // Utility functions
    function trySelectChatById(chatId: number) {
        const match = chatList.find((chat) => Number(chat.id) === chatId);
        if (match) {
            selectedChatId = Number(match.id);
            dispatch('select', { chat: match });
            pendingChatId = null;
            clearChatOpenRequest();
        }
    }

    function hasSearchResults(results: SearchResults | null): boolean {
        if (!results) return false;
        return Boolean(results.chats.length || results.users.length || results.messages.length);
    }
</script>

<div class="list">
    {#if searchActive}
        <div class="search-header">{$_('chat_list.search_results')} «{searchQuery}»</div>
        {#if isSearchLoading}
            <div class="loading">{$_('chat_list.searching')}</div>
        {:else if searchError}
            <div class="error">{searchError}</div>
        {:else if !hasSearchResults(searchResults)}
            <div class="empty">{$_('chat_list.nothing_found')}</div>
        {:else}
            {#if searchResults?.chats.length}
                <div class="search-group">
                    <div class="group-title">{$_('chat_list.chats')}</div>
                    {#each searchResults.chats as chat (chat.id)}
                        <button
                            class={`search-card chat ${selectedChatId === Number(chat.id) ? 'active' : ''}`}
                            type="button"
                            on:click={() => handleSearchChatSelect(chat)}
                        >
                            <div class="card-header">
                                <span class="card-title">{chat.name || `${$_('chat_list.chat')} #${chat.id}`}</span>
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
                    <div class="group-title">{$_('chat_list.users')}</div>
                    {#each searchResults.users as user (user.id)}
                        <button
                            class="search-card user"
                            type="button"
                            on:click={() => handleSearchUserSelect(user)}
                        >
                            <div class="card-header">
                                <span class="card-title">{user.name || user.username}</span>
                                {#if user.is_bot}
                                    <span class="badge alt">{$_('chat_list.bot')}</span>
                                {/if}
                            </div>
                            <div class="card-subtitle muted">@{user.username}</div>
                        </button>
                    {/each}
                </div>
            {/if}

            {#if searchResults?.messages.length}
                <div class="search-group">
                    <div class="group-title">{$_('chat_list.messages')}</div>
                    {#each searchResults.messages as item (item.message.id)}
                        <button
                            class="search-card message"
                            type="button"
                            on:click={() => handleSearchChatSelect(item.chat)}
                        >
                            <div class="card-header">
                                <span class="card-title">{item.chat.name || item.chat.other_user?.name}</span>
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
            <div class="loading">{$_('chat_list.loading_chats')}</div>
        {:else if error}
            <div class="error">{error}</div>
        {:else if chatList.length === 0}
            <div class="empty">{$_('chat_list.no_chats')}</div>
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
        margin: 5px;
        color: var(--color-text);
        padding: 2px;
    }
    
    .list::-webkit-scrollbar {
        width: 6px;
    }
    
    .list::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        transition: background 0.2s ease;
    }
    
    .list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .list::-webkit-scrollbar-thumb:active {
        background: rgba(255, 255, 255, 0.4);
    }
    
    .list {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    
    .list:hover {
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
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
        background: var(--color-bg-elevated);
        color: var(--color-text);
        padding: 12px;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
        transition: var(--transition);
    }

    .search-card:hover {
        filter: var(--hover-filter)
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        flex-wrap: nowrap;
        white-space: nowrap;
        overflow-y: hidden;
        text-overflow: ellipsis;
    }

    .badge.alt {
        background: var(--color-accent-soft)
    }

    .loading, .error, .empty {
        padding: 20px;
        text-align: center;
        opacity: 0.6;
    }
    
    .error {
        color: var(--color-danger);
    }
</style>
