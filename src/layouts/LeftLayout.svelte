<script lang="ts">
    import Input from '../components/ui/Input.svelte';
    import Bar from '../components/ui/Bar.svelte';
    import ChatList from '../components/chat/ChatList.svelte';
    import { createEventDispatcher } from 'svelte';
    import { derived, writable } from 'svelte/store';
    import type { Chat, UserPublic } from '../types/models';
    import { ChatType } from '../types/models';
    import { Settings, Plus } from 'lucide-svelte';
    import { useSearch, type SearchResults } from '../queries/search';

    const dispatch = createEventDispatcher<{ select: { chat: Chat } }>();
    
    export let onToggleSettings: () => void = () => {};
    export let inSettings: boolean = false;
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;
    export let onOpenCreateChat: (preset?: { chatType?: ChatType; memberIds?: number[] }) => void = () => {};

    let searchQuery = '';
    let debouncedQuery = '';
    let selectedChatId: number | null = null;
    let searchResults: SearchResults | null = null;
    let searchIsLoading: boolean = false;
    let searchError: string | null = null;
    let searchActive: boolean = false;
    const searchInput = writable('');
    const debouncedSearch = derived(searchInput, ($value, set) => {
        const trimmed = $value.trim();
        const handle = setTimeout(() => set(trimmed), 250);
        return () => clearTimeout(handle);
    }, '');
    const searchQueryResult = useSearch(debouncedSearch);

    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    $: searchQuery = $searchInput;
    $: debouncedQuery = $debouncedSearch;
    $: searchActive = debouncedQuery.trim().length >= 2;
    $: searchResults = searchActive ? ($searchQueryResult?.data || null) : null;
    $: searchIsLoading = searchActive ? Boolean($searchQueryResult?.isFetching) : false;
    $: searchError = searchActive && $searchQueryResult?.error ? String($searchQueryResult.error) : null;

    function handleChatSelect(event: CustomEvent<{ chat: Chat }>) {
        const { chat } = event.detail;
        selectedChatId = chat.id;
        dispatch('select', { chat });
    }

    function handleToggleSettings() {
        onToggleSettings();
    }

    function handleStartDm(event: CustomEvent<{ user: UserPublic }>) {
        const { user } = event.detail;
        if (user?.id) {
            onOpenCreateChat({ chatType: ChatType.DM, memberIds: [user.id] });
            searchQuery = '';
        }
    }

    function handleCreateChatClick() {
        onOpenCreateChat();
    }
</script>

<div class={`left-layout ${layoutVisibleClass}`} id="left-layout">
   <Bar>
        <div class="search-header">
            {#if isMobile}
                <button
                    class={`settings-button ${inSettings ? 'active' : ''}`}
                    on:click={handleToggleSettings}
                    title="Настройки"
                    aria-label="Настройки"
                >
                    <Settings size={18} />
                </button>
            {/if}
            <Input 
                placeholder="Поиск..."
                style="width: 100%; margin: 10px; padding: 10px;"
                bind:value={$searchInput} />
        </div>
   </Bar>
    <ChatList 
        bind:selectedChatId 
        on:select={handleChatSelect}
        on:startDm={handleStartDm}
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearchLoading={searchIsLoading}
        searchError={searchError}
    />
    {#if isMobile}
        <button 
            class="floating-create" 
            on:click={handleCreateChatClick}
            aria-label="Создать чат"
        >
            <Plus size={22} />
        </button>
    {/if}
</div>

<style>
    .left-layout {
        display: flex;
        flex-direction: column;

        min-height: 0;
        height: 100%;
        width: 100%;
        max-width: 100%;
        position: relative;
        z-index: 0;
        overflow: hidden;

        background-image: 
            linear-gradient(var(--glass), var(--glass)),
            linear-gradient(var(--secondary-color), var(--secondary-color));
                
        transition: var(--transition);
    }

    .left-layout.mobile-hidden {
        transform: translateX(-100%);
        pointer-events: none;
    }

    .left-layout.mobile-visible {
        transform: translateX(0);
    }

    .search-header {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
    }

    .settings-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-right: 10px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: var(--transition);
    }

    .settings-button:hover {
        background: var(--glass);
        color: rgba(255, 255, 255, 0.9);
    }

    .settings-button.active {
        background: var(--primary-color);
        color: var(--text-color);
    }

    .floating-create {
        position: absolute;
        right: 20px;
        bottom: 20px;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-color);
        color: var(--text-color);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: var(--transition);
        z-index: 4;
    }

    .floating-create:hover {
        filter: var(--hover);
    }

    @media (max-width: 576px) {
        .left-layout {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            max-width: 100%;
            z-index: 2;
        }
    }

    @media (min-width: 577px) {
        .left-layout {
            max-width: 320px;
            margin-left: 42px;
        }
    }
</style>