<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { writable, derived } from 'svelte/store';
    import { Search, Image, X, Send } from 'lucide-svelte';
    import { useTrendingGifsQuery, useSearchGifsQuery, useSendGifMutation, useRecentGifsQuery, recentGifsToGifList } from '$lib/queries/gifs';
    import type { GifItem } from '$lib/types/models';
    import { fly, fade, slide } from 'svelte/transition';
    import { _ } from 'svelte-i18n';

    // Props
    export let chatId: number;
    export let isOpen: boolean = false;
    export let isMobile: boolean = false;
    export let triggerButton: HTMLButtonElement;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        selected: { gif: GifItem; attachmentId: number };
    }>();

    // Stores
    const searchInput = writable('');

    // State
    let selectedGif: GifItem | null = null;
    let containerEl: HTMLDivElement;
    let isLoadingMore = false;
    let adjustedX = 0;
    let adjustedY = 0;

    // Computed values
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
    $: showRecentGifs = $searchInput.trim() === '' && recentGifs.length > 0;

    // Position adjustment
    function adjustPosition() {
        if (!containerEl || !triggerButton || isMobile) return;

        const rect = triggerButton.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let x = rect.left;
        let y = rect.bottom + 8;

        if (x + containerRect.width > windowWidth) {
            x = windowWidth - containerRect.width - 16;
        }
        if (x < 16) {
            x = 16;
        }
        if (y + containerRect.height > windowHeight) {
            y = rect.top - containerRect.height - 8;
        }
        if (y < 16) {
            y = 16;
        }

        adjustedX = x;
        adjustedY = y;
    }

    // Event handlers
    function handleGifClick(gif: GifItem) {
        selectedGif = gif;
    }

    async function handleSendGif() {
        if (!selectedGif || $sendGifMutation.isPending) return;

        try {
            const payload = (selectedGif as any).isRecent ? (selectedGif as any).originalData : selectedGif;
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

    function handleClickOutside(event: MouseEvent) {
        if (containerEl && !containerEl.contains(event.target as Node) && !triggerButton?.contains(event.target as Node)) {
            handleClose();
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === containerEl) {
            handleClose();
        }
    }

    // Lifecycle hooks
    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('click', handleClickOutside);
        };
    });

    // Reactive statements
    $: if (isOpen && !isMobile && containerEl) {
        setTimeout(() => adjustPosition(), 0);
    }
</script>

{#if isOpen}
    {#if isMobile}
        <div 
            class="gif-picker-backdrop" 
            bind:this={containerEl}
            on:click={handleBackdropClick}
            transition:fade={{ duration: 200 }}
            role="dialog"
            aria-label={$_('gif_picker.title')}
        >
            <div class="gif-picker mobile" transition:slide={{duration: 300 }}>
                <div class="picker-header">
                    <div class="drag-handle"></div>
                    <div class="header-content">
                        <div class="search">
                            <div class="search-icon">
                                <Search size={16} />
                            </div>
                            <input
                                type="text"
                                class="search-input"
                                placeholder={$_('gif_picker.search_placeholder')}
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
                            title={$_('common.close')}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div class="picker-content">
                    {#if error}
                        <div class="error" in:fade>
                            <span>{$_('gif_picker.load_error')}</span>
                        </div>
                    {:else if isLoading && allGifs.length === 0 && !showRecentGifs}
                        <div class="loader" in:fade>
                            <div class="spinner"></div>
                            <span>{$_('common.loading')}</span>
                        </div>
                    {:else if showRecentGifs && !$showSearchResults}
                        <div class="section">
                            <div class="section-header">
                                <h3 class="section-title">{$_('gif_picker.recent')}</h3>
                            </div>
                            {#if recentIsLoading && recentGifs.length === 0}
                                <div class="loader" in:fade>
                                    <div class="spinner"></div>
                                    <span>{$_('common.loading')}</span>
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
                                <h3 class="section-title">{$_('gif_picker.popular')}</h3>
                            </div>
                            {#if isLoading && allGifs.length === 0}
                                <div class="loader" in:fade>
                                    <div class="spinner"></div>
                                    <span>{$_('common.loading')}</span>
                                </div>
                            {:else if allGifs.length === 0 && !isLoading}
                                <div class="empty" in:fade>
                                    <Image size={32} />
                                    <p>{$_('gif_picker.no_gifs')}</p>
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
                                            {$_('gif_picker.load_more')}
                                        {/if}
                                    </button>
                                {/if}
                            {/if}
                        </div>
                    {:else if allGifs.length === 0 && !isLoading}
                        <div class="empty" in:fade>
                            {#if $showSearchResults}
                                <Image size={32} />
                                <p>{$_('gif_picker.no_results')}</p>
                                <button 
                                    class="back-button" 
                                    on:click={() => searchInput.set('')}
                                >
                                    {$_('gif_picker.back_to_popular')}
                                </button>
                            {:else}
                                <Image size={32} />
                                <p>{$_('gif_picker.no_gifs')}</p>
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
                                    {$_('gif_picker.load_more')}
                                {/if}
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    {:else}
        <div
            class="gif-picker desktop"
            style="left: {adjustedX}px; top: {adjustedY}px;"
            bind:this={containerEl}
            transition:fly={{ y: -20, duration: 200 }}
            on:click|self={handleClickOutside}
            role="dialog"
            aria-label={$_('gif_picker.title')}
        >
            <div class="picker-header">
                <div class="search">
                    <div class="search-icon">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        class="search-input"
                        placeholder={$_('gif_picker.search_placeholder')}
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
                    title={$_('common.close')}
                >
                    <X size={20} />
                </button>
            </div>
            <div class="picker-content">
                {#if error}
                    <div class="error" in:fade>
                        <span>{$_('gif_picker.load_error')}</span>
                    </div>
                {:else if isLoading && allGifs.length === 0 && !showRecentGifs}
                    <div class="loader" in:fade>
                        <div class="spinner"></div>
                        <span>{$_('common.loading')}</span>
                    </div>
                {:else if showRecentGifs && !$showSearchResults}
                    <div class="section">
                        <div class="section-header">
                            <h3 class="section-title">{$_('gif_picker.recent')}</h3>
                        </div>
                        {#if recentIsLoading && recentGifs.length === 0}
                            <div class="loader" in:fade>
                                <div class="spinner"></div>
                                <span>{$_('common.loading')}</span>
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
                            <h3 class="section-title">{$_('gif_picker.popular')}</h3>
                        </div>
                        {#if isLoading && allGifs.length === 0}
                            <div class="loader" in:fade>
                                <div class="spinner"></div>
                                <span>{$_('common.loading')}</span>
                            </div>
                        {:else if allGifs.length === 0 && !isLoading}
                            <div class="empty" in:fade>
                                <Image size={32} />
                                <p>{$_('gif_picker.no_gifs')}</p>
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
                                {$_('gif_picker.load_more')}
                            {/if}
                        </button>
                    {/if}
                {/if}
            </div>
                {:else if allGifs.length === 0 && !isLoading}
                    <div class="empty" in:fade>
                        {#if $showSearchResults}
                            <Image size={32} />
                            <p>{$_('gif_picker.no_results')}</p>
                            <button 
                                class="back-button" 
                                on:click={() => searchInput.set('')}
                            >
                                {$_('gif_picker.back_to_popular')}
                            </button>
                        {:else}
                            <Image size={32} />
                            <p>{$_('gif_picker.no_gifs')}</p>
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
                                {$_('gif_picker.load_more')}
                            {/if}
                        </button>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
{/if}

<style>
    .gif-picker.desktop {
        position: fixed;
        z-index: 1000;
        width: 360px;
        max-height: 480px;
        background: var(--color-bg-elevated);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .gif-picker-backdrop {
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

    .gif-picker.mobile {
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

    .picker-header {
        flex-shrink: 0;
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg);
    }

    .gif-picker.mobile .picker-header {
        border-bottom: none;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
    }

    .gif-picker.desktop .header-content {
        padding: 12px;
        gap: 8px;
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

    .gif-picker.mobile .search-input {
        padding: 12px;
        padding-left: 40px;
        font-size: 16px;
        border-radius: 12px;
        -webkit-appearance: none;
    }

    .gif-picker.desktop .search-input {
        padding: 10px;
        padding-left: 36px;
        font-size: 14px;
        border-radius: var(--radius-md);
    }

    .search-input {
        width: 100%;
        border: 1px solid var(--color-border);
        background: var(--color-bg);
        color: var(--color-text);
        outline: none;
        transition: all 0.2s ease;
    }

    .search-input::placeholder {
        color: var(--color-text-muted);
    }

    .gif-picker.mobile .clear-search {
        right: 12px;
        padding: 8px;
        border-radius: 8px;
    }

    .gif-picker.desktop .clear-search {
        right: 10px;
        padding: 6px;
        border-radius: var(--radius-sm);
    }

    .clear-search {
        position: absolute;
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 1;
    }

    .gif-picker.mobile .close {
        padding: 12px;
        border-radius: 12px;
    }

    .gif-picker.desktop .close {
        padding: 8px;
        border-radius: var(--radius-md);
    }

    .close {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .close:hover {
        color: var(--color-text);
        background: var(--color-bg-hover);
        transform: scale(1.05);
    }

    .picker-content {
        flex: 1;
        overflow-y: auto;
    }

    .gif-picker.mobile .picker-content {
        padding: 16px;
        -webkit-overflow-scrolling: touch;
    }

    .gif-picker.desktop .picker-content {
        padding: 16px;
    }

    .section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
    }

    .gif-picker.mobile .section {
        gap: 16px;
        margin-bottom: 24px;
    }

    .section:last-child {
        margin-bottom: 0;
    }

    .section-header {
        padding-bottom: 8px;
        border-bottom: 1px solid var(--color-border);
    }

    .gif-picker.mobile .section-header {
        padding-bottom: 12px;
    }

    .section-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .gif-picker.mobile .section-title {
        font-size: 16px;
    }

    .error {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-danger);
        padding: 24px;
        text-align: center;
    }

    .gif-picker.mobile .error {
        padding: 32px;
        font-size: 16px;
    }

    .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 12px;
        color: var(--color-text-muted);
    }

    .gif-picker.mobile .loader {
        padding: 48px;
        gap: 16px;
        font-size: 16px;
    }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        gap: 12px;
        text-align: center;
        color: var(--color-text-muted);
    }

    .gif-picker.mobile .empty {
        padding: 48px;
        gap: 16px;
        font-size: 16px;
    }

    .back-button {
        margin-top: 8px;
        background: none;
        border: none;
        color: var(--color-accent);
        cursor: pointer;
        font-size: 14px;
        text-decoration: underline;
    }

    .gif-picker.mobile .back-button {
        margin-top: 12px;
        font-size: 16px;
        padding: 8px;
    }

    .gif-picker.desktop .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .gif-picker.mobile .grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }

    .grid {
        display: grid;
    }

    @media (max-width: 480px) {
        .gif-picker.mobile .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
    }

    .item {
        position: relative;
        aspect-ratio: 1;
        border-radius: var(--radius-md);
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        background: var(--color-bg-hover);
    }

    .gif-picker.mobile .item {
        border-radius: 12px;
    }

    .gif-picker.mobile .item:hover {
        transform: scale(1.02);
    }

    .item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .item-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .gif-picker.mobile .item-overlay {
        background: rgba(0, 0, 0, 0.7);
    }

    .gif-picker.mobile .send-btn {
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 16px;
    }

    .gif-picker.desktop .send-btn {
        border-radius: var(--radius-md);
        padding: 10px 18px;
        font-size: 14px;
    }

    .send-btn {
        background: var(--color-accent);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .send-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: scale(1.05);
    }

    .send-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .gif-picker.mobile .load-more {
        margin-top: 24px;
        padding: 16px;
        font-size: 16px;
        border-radius: 12px;
    }

    .gif-picker.desktop .load-more {
        margin-top: 20px;
        padding: 12px;
        font-size: 14px;
        border-radius: var(--radius-md);
    }

    .load-more {
        width: 100%;
        border: 1px solid var(--color-border);
        color: var(--color-text);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .load-more:hover:not(:disabled) {
        background: var(--color-border);
        transform: translateY(-1px);
    }

    .gif-picker.mobile .load-more:hover:not(:disabled) {
        transform: translateY(-2px);
    }

    .load-more:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .gif-picker.mobile .spinner {
        width: 28px;
        height: 28px;
        border: 3px solid var(--color-border);
        border-top: 3px solid var(--color-accent);
    }

    .gif-picker.desktop .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-border);
        border-top: 2px solid var(--color-accent);
    }

    .spinner {
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .gif-picker.mobile .btn-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
    }

    .gif-picker.desktop .btn-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
    }

    .btn-spinner {
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .btn-spinner.small {
        width: 12px;
        height: 12px;
        border-width: 1.5px;
    }

    .gif-picker.mobile .btn-spinner.small {
        width: 14px;
        height: 14px;
        border-width: 2px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .gif-picker.mobile .picker-content::-webkit-scrollbar {
        width: 4px;
    }

    .gif-picker.desktop .picker-content::-webkit-scrollbar {
        width: 6px;
    }

    .picker-content::-webkit-scrollbar-track {
        background: transparent;
    }

    .gif-picker.mobile .picker-content::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 2px;
    }

    .gif-picker.desktop .picker-content::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 3px;
    }

    .picker-content::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-muted);
    }

    @media (max-width: 480px) {
        .gif-picker.mobile .header-content {
            padding: 12px;
        }
        
        .gif-picker.mobile .picker-content {
            padding: 12px;
        }
    }
</style>
