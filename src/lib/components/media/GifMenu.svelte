<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { writable, derived } from 'svelte/store';
    import { Search, Image, X, Send, ChevronDown } from 'lucide-svelte';
    import { useTrendingGifsQuery, useSearchGifsQuery, useSendGifMutation, useRecentGifsQuery, recentGifsToGifList } from '$lib/queries/gifs';
    import type { GifItem } from '$lib/types/models';
    import { fly, fade, slide } from 'svelte/transition';

    export let chatId: number;
    export let isOpen: boolean = false;

    const dispatch = createEventDispatcher<{
        close: void;
        selected: { gif: GifItem; attachmentId: number };
    }>();

    let searchInput = writable('');
    let selectedGif: GifItem | null = null;
    let containerEl: HTMLDivElement;
    let isLoadingMore = false;

    const debouncedSearch = derived(searchInput, ($value, set) => {
        const handle = setTimeout(() => set($value.trim()), 300);
        return () => clearTimeout(handle);
    }, '');

    const showSearchResults = derived(debouncedSearch, $value => $value.length >= 2);
    const showPopularSection = derived([searchInput, showSearchResults], ([$searchInput, $showSearchResults]) => {
        return $searchInput.trim() === '' && !$showSearchResults;
    });

    const trendingQuery = useTrendingGifsQuery();
    const searchQuery = useSearchGifsQuery(debouncedSearch, { 
        enabled: isOpen && $showSearchResults 
    });
    const recentQuery = useRecentGifsQuery();

    const sendGifMutation = useSendGifMutation(chatId);

    $: currentQuery = $showSearchResults ? searchQuery : trendingQuery;
    $: isLoading = $currentQuery?.isFetching && !isLoadingMore;
    $: error = $currentQuery?.error ? String($currentQuery.error) : null;
    $: pages = $currentQuery?.data?.pages ?? [];
    $: allGifs = pages.flatMap((page: any) => {
        if (Array.isArray(page)) return page;
        if (page.data && Array.isArray(page.data)) return page.data;
        if (page.gifs && Array.isArray(page.gifs)) return page.gifs;
        return [];
    });
    $: hasMore = pages.length > 0 && (((pages[pages.length - 1] as any)?.pagination?.has_more) ?? false);

    $: recentPages = $recentQuery?.data?.pages ?? [];
    $: recentGifs = recentPages.flatMap((page: any) => {
        if (Array.isArray(page)) {
            return page.map((gif: any) => ({
                id: gif.gif_id,
                title: gif.title || '',
                preview_url: gif.preview_url,
                url: gif.url,
                width: gif.width,
                height: gif.height,
                isRecent: true,
                originalData: gif
            }));
        }
        if (page.data && Array.isArray(page.data)) {
            return page.data.map((gif: any) => ({
                id: gif.gif_id,
                title: gif.title || '',
                preview_url: gif.preview_url,
                url: gif.url,
                width: gif.width,
                height: gif.height,
                isRecent: true,
                originalData: gif
            }));
        }
        if (page.gifs && Array.isArray(page.gifs)) {
            return page.gifs.map((gif: any) => ({
                id: gif.gif_id,
                title: gif.title || '',
                preview_url: gif.preview_url,
                url: gif.url,
                width: gif.width,
                height: gif.height,
                isRecent: true,
                originalData: gif
            }));
        }
        return [];
    });
    $: recentError = $recentQuery?.error ? String($recentQuery.error) : null;
    $: recentIsLoading = $recentQuery?.isFetching && recentGifs.length === 0;

    function handleGifClick(gif: GifItem) {
        selectedGif = gif;
    }

    async function handleSendGif() {
        if (!selectedGif || $sendGifMutation.isPending) return;

        try {
            const payload = selectedGif.isRecent ? selectedGif.originalData : selectedGif;
            const attachment = await $sendGifMutation.mutateAsync(payload);
            dispatch('selected', { gif: selectedGif, attachmentId: attachment.id });
            selectedGif = null;
            searchInput.set('');
        } catch (err) {
            console.error('Failed to send GIF:', err);
        }
    }

    function handleClose() {
        if (!$sendGifMutation.isPending) {
            dispatch('close');
            selectedGif = null;
            searchInput.set('');
        }
    }

    async function loadMore() {
        if (hasMore && !$currentQuery?.isFetching && $currentQuery?.fetchNextPage) {
            isLoadingMore = true;
            await $currentQuery.fetchNextPage();
            isLoadingMore = false;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            handleClose();
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    });

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === containerEl) {
            handleClose();
        }
    }

    $: showRecentGifs = $searchInput.trim() === '' && recentGifs.length > 0;
</script>

{#if isOpen}
    <div 
        class="gif-menu-backdrop" 
        bind:this={containerEl}
        on:click={handleBackdropClick}
        transition:fade={{ duration: 200 }}
        role="dialog"
        aria-label="Выбор GIF"
    >
        <div class="gif-menu" transition:slide={{ y: 1, duration: 300 }}>
            <div class="menu-header">
                <div class="drag-handle"></div>
                <div class="header-content">
                    <div class="search">
                        <div class="search-icon">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            class="search-input"
                            placeholder="Поиск GIF..."
                            bind:value={$searchInput}
                        />
                        {#if $searchInput}
                            <button 
                                class="clear-search" 
                                on:click={() => searchInput.set('')}
                            >
                                <X size={16} />
                            </button>
                        {/if}
                    </div>
                    <button 
                        class="close" 
                        on:click={handleClose}
                        title="Закрыть"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div class="menu-content">
                {#if error}
                    <div class="error" in:fade>
                        <span>Ошибка загрузки GIF</span>
                    </div>
                {:else if isLoading && allGifs.length === 0 && !showRecentGifs}
                    <div class="loader" in:fade>
                        <div class="spinner"></div>
                        <span>Загрузка...</span>
                    </div>
                {:else if showRecentGifs && !$showSearchResults}
                    <div class="section">
                        <div class="section-header">
                            <h3 class="section-title">Недавние гифки</h3>
                        </div>
                        {#if recentIsLoading && recentGifs.length === 0}
                            <div class="loader" in:fade>
                                <div class="spinner"></div>
                                <span>Загрузка...</span>
                            </div>
                        {:else}
                            <div class="grid">
                                {#each recentGifs as gif (gif.id)}
                                    <div
                                        class="item"
                                        class:selected={selectedGif?.id === gif.id}
                                        on:click={() => handleGifClick(gif)}
                                        title={gif.title}
                                    >
                                        <img
                                            src={gif.preview_url}
                                            alt={gif.title}
                                            loading="lazy"
                                        />
                                        {#if selectedGif?.id === gif.id}
                                            <div class="item-overlay" in:fade>
                                                <button
                                                    class="send-btn"
                                                    on:click={handleSendGif}
                                                    disabled={$sendGifMutation.isPending}
                                                >
                                                    {#if $sendGifMutation.isPending}
                                                        <div class="btn-spinner"></div>
                                                    {:else}
                                                        <Send size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
                
                {#if $showPopularSection}
                    <div class="section">
                        <div class="section-header">
                            <h3 class="section-title">Популярные гифки</h3>
                        </div>
                        {#if isLoading && allGifs.length === 0}
                            <div class="loader" in:fade>
                                <div class="spinner"></div>
                                <span>Загрузка...</span>
                            </div>
                        {:else if allGifs.length === 0 && !isLoading}
                            <div class="empty" in:fade>
                                <Image size={32} />
                                <p>Здесь будут GIF</p>
                            </div>
                        {:else}
                            <div class="grid">
                                {#each allGifs as gif (gif.id)}
                                    <div
                                        class="item"
                                        class:selected={selectedGif?.id === gif.id}
                                        on:click={() => handleGifClick(gif)}
                                        title={gif.title}
                                    >
                                        <img
                                            src={gif.preview_url}
                                            alt={gif.title}
                                            loading="lazy"
                                        />
                                        {#if selectedGif?.id === gif.id}
                                            <div class="item-overlay" in:fade>
                                                <button
                                                    class="send-btn"
                                                    on:click={handleSendGif}
                                                    disabled={$sendGifMutation.isPending}
                                                >
                                                    {#if $sendGifMutation.isPending}
                                                        <div class="btn-spinner"></div>
                                                    {:else}
                                                        <Send size={14} />
                                                    {/if}
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                            
                            {#if hasMore}
                                <button
                                    class="load-more"
                                    on:click={loadMore}
                                    disabled={isLoadingMore || $currentQuery?.isFetching}
                                >
                                    {#if isLoadingMore}
                                        <div class="btn-spinner small"></div>
                                    {:else}
                                        Загрузить ещё
                                    {/if}
                                </button>
                            {/if}
                        {/if}
                    </div>
                {:else if allGifs.length === 0 && !isLoading}
                    <div class="empty" in:fade>
                        {#if $showSearchResults}
                            <Image size={32} />
                            <p>Ничего не найдено</p>
                            <button 
                                class="back-button" 
                                on:click={() => searchInput.set('')}
                            >
                                Вернуться к популярным
                            </button>
                        {:else}
                            <Image size={32} />
                            <p>Здесь будут GIF</p>
                        {/if}
                    </div>
                {:else}
                    <div class="grid">
                        {#each allGifs as gif (gif.id)}
                            <div
                                class="item"
                                class:selected={selectedGif?.id === gif.id}
                                on:click={() => handleGifClick(gif)}
                                title={gif.title}
                            >
                                <img
                                    src={gif.preview_url}
                                    alt={gif.title}
                                    loading="lazy"
                                />
                                {#if selectedGif?.id === gif.id}
                                    <div class="item-overlay" in:fade>
                                        <button
                                            class="send-btn"
                                            on:click={handleSendGif}
                                            disabled={$sendGifMutation.isPending}
                                        >
                                            {#if $sendGifMutation.isPending}
                                                <div class="btn-spinner"></div>
                                            {:else}
                                                <Send size={14} />
                                            {/if}
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                    
                    {#if hasMore}
                        <button
                            class="load-more"
                            on:click={loadMore}
                            disabled={isLoadingMore || $currentQuery?.isFetching}
                        >
                            {#if isLoadingMore}
                                <div class="btn-spinner small"></div>
                            {:else}
                                Загрузить ещё
                            {/if}
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .gif-menu-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
    }

    .gif-menu {
        width: 100%;
        max-width: 100%;
        max-height: 85vh;
        background: var(--color-bg-elevated);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
    }

    .drag-handle {
        width: 40px;
        height: 4px;
        background: var(--color-border);
        border-radius: 2px;
        margin: 8px auto;
        flex-shrink: 0;
    }

    .menu-header {
        flex-shrink: 0;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg);
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
    }

    .search {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        pointer-events: none;
        z-index: 1;
    }

    .search-input {
        width: 100%;
        padding: 12px;
        padding-left: 40px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        background: var(--color-bg);
        color: var(--color-text);
        font-size: 16px;
        outline: none;
        transition: all 0.2s ease;
        -webkit-appearance: none;
    }

    .search-input:focus {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 99, 102, 241), 0.1);
    }

    .search-input::placeholder {
        color: var(--color-text-muted);
    }

    .clear-search {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        border-radius: 8px;
        z-index: 1;
    }

    .clear-search:hover {
        color: var(--color-text);
        background: var(--color-bg-hover);
    }

    .close {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        border-radius: 12px;
        flex-shrink: 0;
    }

    .close:hover {
        color: var(--color-text);
        background: var(--color-bg-hover);
        transform: scale(1.05);
    }

    .menu-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        -webkit-overflow-scrolling: touch;
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
    }

    .section:last-child {
        margin-bottom: 0;
    }

    .section-header {
        padding-bottom: 12px;
        border-bottom: 1px solid var(--color-border);
    }

    .section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .error {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-danger);
        padding: 32px;
        text-align: center;
        font-size: 16px;
    }

    .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;
        color: var(--color-text-muted);
        font-size: 16px;
    }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 16px;
    }

    .back-button {
        margin-top: 12px;
        background: none;
        border: none;
        color: var(--color-accent);
        cursor: pointer;
        font-size: 16px;
        text-decoration: underline;
        padding: 8px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }

    .item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        background: var(--color-bg-hover);
    }

    .item:hover {
        border-color: var(--color-border-hover);
        transform: scale(1.02);
        box-shadow: var(--shadow-md);
    }

    .item.selected {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 99, 102, 241), 0.2);
    }

    .item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .item-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .send-btn {
        background: var(--color-accent);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: var(--shadow-sm);
    }

    .send-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: scale(1.05);
        box-shadow: var(--shadow-md);
    }

    .send-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .load-more {
        width: 100%;
        margin-top: 24px;
        padding: 16px;
        background: var(--color-bg-hover);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        color: var(--color-text);
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .load-more:hover:not(:disabled) {
        background: var(--color-border);
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }

    .load-more:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .spinner {
        width: 28px;
        height: 28px;
        border: 3px solid var(--color-border);
        border-top: 3px solid var(--color-accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .btn-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .btn-spinner.small {
        width: 14px;
        height: 14px;
        border-width: 2px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .menu-content::-webkit-scrollbar {
        width: 4px;
    }

    .menu-content::-webkit-scrollbar-track {
        background: transparent;
    }

    .menu-content::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 2px;
    }

    .menu-content::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-muted);
    }

    @media (max-width: 480px) {
        .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .header-content {
            padding: 12px;
        }
        
        .menu-content {
            padding: 12px;
        }
    }
</style>
