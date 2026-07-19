<script lang="ts">
    import type { MessageMedia, Message } from '$lib/types/models';
    import MediaItem from './MediaItem.svelte';
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { calculateMediaLayout, type MediaLayoutWithPercents } from '$lib/utils/media';

    export let media: MessageMedia[];
    export let maxItems: number = 10;
    export let isOwn: boolean = false;
    export let currentUserId: number | null = null;
    export let message: Message | null = null;

    const dispatch = createEventDispatcher();

    // State
    let containerMaxWidth: number | null = null;
    let containerElement: HTMLElement;

    // Computed Values
    $: effectiveMaxWidth = containerMaxWidth || 400; 

    $: visualMedia = media.filter(m => 
        m.type === 'Photo' || m.type === 'Video' || m.type === 'Gif' || m.type === 'Sticker'
    );
    
    $: otherMedia = media.filter(m => 
        m.type !== 'Photo' && m.type !== 'Video' && m.type !== 'Gif' && m.type !== 'Sticker'
    );

    $: displayVisualMedia = visualMedia;
    $: hasMoreVisual = visualMedia.length > maxItems;
    $: hiddenCount = visualMedia.length > maxItems ? visualMedia.length - maxItems : 0;

    $: mediaLayout = calculateMediaLayout(displayVisualMedia, effectiveMaxWidth) as MediaLayoutWithPercents;
    $: hasMoreOther = otherMedia.length > maxItems;

    const updateMaxWidth = () => {
        if (containerElement) {
            const messageContent = containerElement.closest('.message-content');
            let availableWidth = messageContent ? messageContent.clientWidth : 0;
            
            if (!availableWidth || availableWidth < 50) {
                const parent = containerElement.parentElement;
                availableWidth = parent ? parent.clientWidth : containerElement.clientWidth;
            }

            let targetWidth = Math.min(availableWidth > 20 ? availableWidth - 20 : availableWidth, 480);

            if (targetWidth > 100 && targetWidth !== containerMaxWidth) {
                containerMaxWidth = targetWidth;
                return true;
            }
        }
        return false;
    };

    const tryUpdateMaxWidth = async (maxRetries = 5, delay = 100) => {
        for (let i = 0; i < maxRetries; i++) {
            await tick();
            if (updateMaxWidth()) {
                return;
            }
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    };

    // Lifecycle hooks
    onMount(() => {
        let cleanup: (() => void) | undefined;
        
        const setup = async () => {
            await tryUpdateMaxWidth();
            
            if (containerElement) {
                const target = containerElement.closest('.message-content') || containerElement;
                const resizeObserver = new ResizeObserver(() => {
                    updateMaxWidth();
                });
                resizeObserver.observe(target);
                
                cleanup = () => {
                    resizeObserver.disconnect();
                };
            }
        };
        
        setup();
        return () => cleanup?.();
    });

    function handleMediaClick(event: CustomEvent) {
        dispatch('mediaClick', { 
            media: event.detail.media, 
            allMedia: media,
            index: media.indexOf(event.detail.media)
        });
    }

    function handleMediaView(event: CustomEvent) {
        dispatch('mediaView', { 
            media: event.detail.media, 
            allMedia: media,
            index: media.indexOf(event.detail.media)
        });
    }
</script>

{#if media && media.length > 0}
    <div class="media-list" bind:this={containerElement} style="width: fit-content; max-width: 100%;">
        {#if visualMedia.length > 0}
            {#if visualMedia.length === 1}
                <div class="visual-media-group single-item">
                    <MediaItem
                        media={visualMedia[0]}
                        width={null}
                        height={null}
                        isInAlbum={false}
                        {currentUserId}
                        {message}
                        on:mediaClick={handleMediaClick}
                        on:view={handleMediaView}
                    />
                </div>
            {:else}
                <div 
                    class="visual-media-group" 
                    style="width: {effectiveMaxWidth}px; max-width: 100%; height: {mediaLayout.height}px;"
                >
                    {#each mediaLayout.layout as item (item.item)}
                        <div
                            class="album-item"
                            style="left: {item.xPercent}%; top: {item.y}px; width: {item.widthPercent}%; height: {item.height}px;"
                        >
                            <MediaItem
                                media={displayVisualMedia[item.item]}
                                width={item.width}
                                height={item.height}
                                isInAlbum={true}
                                isSingleItem={false}
                                {currentUserId}
                                {message}
                                on:mediaClick={handleMediaClick}
                                on:view={handleMediaView}
                            />
                        </div>
                    {/each}
                    
                    {#if hasMoreVisual}
                        <div class="more-items">
                            <span>+{hiddenCount}</span>
                        </div>
                    {/if}
                </div>
            {/if}
        {/if}
        
        {#if otherMedia.length > 0}
            <div class="other-media-group">
                {#each otherMedia.slice(0, maxItems) as mediaItem (mediaItem.type + JSON.stringify(mediaItem))}
                    <MediaItem 
                        media={mediaItem} 
                        {currentUserId}
                        {message}
                        on:mediaClick={handleMediaClick}
                        on:view={handleMediaView}
                    />
                {/each}
                
                {#if hasMoreOther}
                    <div class="more-items-text">
                        <span>+{otherMedia.length - maxItems} {$_('media.more_items')}</span>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style>
    .media-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 8px;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
    }

    .visual-media-group {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: transparent;
        box-sizing: border-box;
    }

    .visual-media-group.single-item {
        height: auto;
    }

    .visual-media-group.single-item :global(.media-item) {
        width: 100% !important;
        height: auto !important;
        position: relative !important;
        left: auto !important;
        top: auto !important;
    }

    .album-item {
        position: absolute;
        overflow: hidden;
        border-radius: 8px;
        box-sizing: border-box;
    }

    .album-item :global(.media-item) {
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 0;
        min-width: 0;
        min-height: 0;
    }

    .other-media-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
    }

    .more-items {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        pointer-events: none;
        z-index: 5;
    }

    .more-items-text {
        padding: 8px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        font-weight: 500;
        background: var(--surface-glass);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    @media (max-width: 768px) {
        .media-list, .other-media-group { gap: 6px; }
    }

    @media (max-width: 480px) {
        .media-list, .other-media-group { gap: 4px; }
        .more-items { bottom: 4px; right: 4px; padding: 2px 6px; font-size: 10px; }
        .more-items-text { padding: 6px; font-size: 0.8rem; }
    }
</style>