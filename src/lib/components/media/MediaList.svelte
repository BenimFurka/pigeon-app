<script lang="ts">
    import type { MessageMedia, Message, PhotoMedia, GifMedia, StickerMedia, VideoMedia } from '$lib/types/models';
    import MediaItem from './MediaItem.svelte';
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { _ } from 'svelte-i18n';

    export let media: MessageMedia[];
    export let maxItems: number = 10;
    export let isOwn: boolean = false;
    export let currentUserId: number | null = null;
    export let message: Message | null = null;

    const dispatch = createEventDispatcher();

    // State
    let containerMaxWidth: number | null = null;
    let containerElement: HTMLElement;
    let mutationObserver: MutationObserver | null = null;

    // Computed values
    $: visualMedia = media.filter(m => 
        m.type === 'Photo' || m.type === 'Video' || m.type === 'Gif' || m.type === 'Sticker'
    );
    
    $: otherMedia = media.filter(m => 
        m.type !== 'Photo' && m.type !== 'Video' && m.type !== 'Gif' && m.type !== 'Sticker'
    );

    $: mediaLayout = calculateMediaLayout(visualMedia, containerMaxWidth);
    $: displayVisualMedia = visualMedia.slice(0, maxItems);
    $: hasMoreVisual = visualMedia.length > maxItems;
    $: hasMoreOther = otherMedia.length > maxItems;

    function calculateMediaLayout(visualMedia: MessageMedia[], maxWidth: number | null) {
        if (!visualMedia.length || !maxWidth) {
            return { width: null, height: null, layout: [] };
        }

        const items = visualMedia.map(m => {
            let width = 200, height = 200;

            switch (m.type) {
                case 'Photo': {
                    const photo = m as PhotoMedia;
                    width = photo.width || 200;
                    height = photo.height || 200;
                    break;
                }
                case 'Video': {
                    const video = m as VideoMedia;
                    width = video.width || 200;
                    height = video.height || 200;
                    break;
                }
                case 'Gif': {
                    const gif = m as GifMedia;
                    width = gif.width || 200;
                    height = gif.height || 200;
                    break;
                }
                case 'Sticker': {
                    const sticker = m as StickerMedia;
                    width = sticker.width || 200;
                    height = sticker.height || 200;
                    break;
                }
                default:
                    width = 200;
                    height = 200;
            }

            return { w: width, h: height };
        });

        const layout = createAlbumLayout({
            items,
            maxWidth,
            minWidth: 50,
            spacing: 2,
            maxHeight: 1200,
            forMedia: true
        });

        if (visualMedia.length === 1) {
            return layout;
        }

        const layoutWithPercents = {
            width: layout.width,
            height: layout.height,
            layout: layout.layout.map(item => ({
                ...item,
                xPercent: (item.x / layout.width) * 100,
                widthPercent: (item.width / layout.width) * 100
            }))
        };

        return layoutWithPercents;
    }

    function createAlbumLayout(options: {
        items: { w: number, h: number }[],
        maxWidth: number,
        minWidth: number,
        spacing: number,
        maxHeight?: number,
        forMedia?: boolean
    }) {
        const { items, maxWidth, minWidth, spacing, maxHeight = maxWidth * 1.5 } = options;
        const count = items.length;

        if (count === 0) return { width: 0, height: 0, layout: [] };
        if (count === 1) {
            const item = items[0];
            const aspectRatio = item.w / item.h;
            const reasonableMaxWidth = Math.max(maxWidth, 800);
            const width = Math.min(item.w, reasonableMaxWidth);
            const height = width / aspectRatio;
            return {
                width,
                height,
                layout: [{ x: 0, y: 0, width, height, item: 0 }]
            };
        }

        if (count === 2) {
            return layoutTwoItems(items, maxWidth, spacing, maxHeight);
        } else if (count === 3) {
            return layoutThreeItems(items, maxWidth, spacing, maxHeight);
        } else if (count === 4) {
            return layoutFourItems(items, maxWidth, spacing, maxHeight);
        }

        return layoutGridItems(items, maxWidth, minWidth, spacing, maxHeight);
    }

    function layoutTwoItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number) {
        const aspectRatio1 = items[0].w / items[0].h;
        const aspectRatio2 = items[1].w / items[1].h;

        if (aspectRatio1 > 1.4 && aspectRatio2 > 1.4) {
            const width = maxWidth;
            const height1 = Math.min(width / aspectRatio1, (maxHeight - spacing) / 2);
            const height2 = Math.min(width / aspectRatio2, (maxHeight - spacing) / 2);
            return {
                width,
                height: height1 + height2 + spacing,
                layout: [
                    { x: 0, y: 0, width, height: height1, item: 0 },
                    { x: 0, y: height1 + spacing, width, height: height2, item: 1 }
                ]
            };
        }

        const totalWidth = maxWidth - spacing;
        const width1 = Math.round(totalWidth * 0.6);
        const width2 = totalWidth - width1;
        const height = Math.min(
            width1 / aspectRatio1,
            width2 / aspectRatio2,
            maxHeight
        );

        return {
            width: maxWidth,
            height,
            layout: [
                { x: 0, y: 0, width: width1, height, item: 0 },
                { x: width1 + spacing, y: 0, width: width2, height, item: 1 }
            ]
        };
    }

    function layoutThreeItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number) {
        const topWidth = maxWidth;
        const topHeight = Math.min(topWidth / (items[0].w / items[0].h), maxHeight * 0.66);
        const remainingHeight = maxHeight - topHeight - spacing;
        const bottomWidth = (maxWidth - spacing) / 2;
        const bottomHeight = Math.min(remainingHeight, bottomWidth / Math.max(items[1].w / items[1].h, items[2].w / items[2].h));

        return {
            width: maxWidth,
            height: topHeight + bottomHeight + spacing,
            layout: [
                { x: 0, y: 0, width: topWidth, height: topHeight, item: 0 },
                { x: 0, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 1 },
                { x: bottomWidth + spacing, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 2 }
            ]
        };
    }

    function layoutFourItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number) {
        const topWidth = maxWidth;
        const topHeight = Math.min(topWidth / (items[0].w / items[0].h), maxHeight * 0.66);
        const remainingWidth = maxWidth - 2 * spacing;
        const bottomWidth = remainingWidth / 3;
        const bottomHeight = Math.min(
            maxHeight - topHeight - spacing,
            bottomWidth / Math.max(...items.slice(1).map(item => item.w / item.h))
        );

        return {
            width: maxWidth,
            height: topHeight + bottomHeight + spacing,
            layout: [
                { x: 0, y: 0, width: topWidth, height: topHeight, item: 0 },
                { x: 0, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 1 },
                { x: bottomWidth + spacing, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 2 },
                { x: (bottomWidth + spacing) * 2, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 3 }
            ]
        };
    }

    function layoutGridItems(items: { w: number, h: number }[], maxWidth: number, minWidth: number, spacing: number, maxHeight: number) {
        const cols = Math.min(3, Math.floor(maxWidth / (minWidth + spacing)));
        const itemWidth = Math.floor((maxWidth - spacing * (cols - 1)) / cols);
        const itemHeight = Math.min(itemWidth / Math.max(...items.map(item => item.w / item.h)), maxHeight / Math.ceil(items.length / cols));
        
        const layout = [];
        for (let i = 0; i < items.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            layout.push({
                x: col * (itemWidth + spacing),
                y: row * (itemHeight + spacing),
                width: itemWidth,
                height: itemHeight,
                item: i
            });
        }

        const rows = Math.ceil(items.length / cols);
        return {
            width: maxWidth,
            height: rows * itemHeight + spacing * (rows - 1),
            layout
        };
    }

    function getParentChain(element: HTMLElement | null): string[] {
        const chain: string[] = [];
        let current = element;
        
        while (current && current !== document.body) {
            chain.push(`${current.tagName.toLowerCase()}${current.className ? '.' + current.className.split(' ').join('.') : ''}`);
            current = current.parentElement;
        }
        
        return chain;
    }

    const updateMaxWidth = async () => {
        if (containerElement) {
            const bubbleElement = containerElement.closest('.bubble.has-media');

            if (bubbleElement) {
                const actualWidth = bubbleElement.clientWidth;

                if (actualWidth > 0) {
                    if (actualWidth !== containerMaxWidth) {
                        containerMaxWidth = actualWidth;
                    }
                    return true;
                }

                const computedStyle = window.getComputedStyle(bubbleElement);
                const maxWidth = computedStyle.getPropertyValue('max-width');

                if (maxWidth && maxWidth !== 'none') {
                    let newMaxWidth: number | null = null;

                    if (maxWidth.includes('%')) {
                        const parentWidth = bubbleElement.parentElement?.clientWidth || window.innerWidth;
                        newMaxWidth = Math.round(parentWidth * parseFloat(maxWidth) / 100);
                    } else {
                        newMaxWidth = parseInt(maxWidth) || null;
                    }

                    if (newMaxWidth !== null && (isNaN(newMaxWidth) || newMaxWidth <= 0)) {
                        newMaxWidth = 400;
                    }

                    if (newMaxWidth !== containerMaxWidth) {
                        containerMaxWidth = newMaxWidth;
                    }
                    return true;
                } else {
                    const parentWidth = bubbleElement.parentElement?.clientWidth || window.innerWidth;
                    const fallbackWidth = parentWidth > 400 ? parentWidth : 400;
                    if (fallbackWidth !== containerMaxWidth) {
                        containerMaxWidth = fallbackWidth;
                    }
                    return true;
                }
            } else {
                const messageBubble = containerElement.closest('.message, .bubble, [class*="message"], [class*="bubble"]');

                if (messageBubble) {
                    const messageWidth = messageBubble.clientWidth;
                    const fallbackWidth = messageWidth > 100 ? messageWidth : 400;
                    if (fallbackWidth !== containerMaxWidth) {
                        containerMaxWidth = fallbackWidth;
                    }
                } else {
                    const windowWidth = window.innerWidth;
                    const reasonableWidth = Math.min(windowWidth * 0.8, 600);
                    const fallbackWidth = reasonableWidth > 200 ? reasonableWidth : 400;
                    if (fallbackWidth !== containerMaxWidth) {
                        containerMaxWidth = fallbackWidth;
                    }
                }
                return true;
            }
        }

        const defaultWidth = 400;
        if (containerMaxWidth !== defaultWidth) {
            containerMaxWidth = defaultWidth;
        }
        return false;
    };

    const tryUpdateMaxWidth = async (maxRetries = 5, delay = 100) => {
        for (let i = 0; i < maxRetries; i++) {
            await tick();
            if (await updateMaxWidth()) {
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
                mutationObserver = new MutationObserver(async () => {
                    await tryUpdateMaxWidth(3, 50);
                });
                
                mutationObserver.observe(containerElement.parentElement!, {
                    attributes: true,
                    attributeFilter: ['class'],
                    subtree: true,
                    childList: true
                });
            }
            
            const resizeObserver = new ResizeObserver(async () => {
                await updateMaxWidth();
            });
            
            if (containerElement) {
                resizeObserver.observe(containerElement.parentElement!);
            }
            
            cleanup = () => {
                resizeObserver.disconnect();
                mutationObserver?.disconnect();
            };
        };
        
        setup();
        
        return () => {
            cleanup?.();
        };
    });
    function handleMediaClick(event: CustomEvent) {
        const { media: clickedMedia } = event.detail;
        dispatch('mediaClick', { 
            media: clickedMedia, 
            allMedia: media,
            index: media.indexOf(clickedMedia)
        });
    }

    function handleMediaView(event: CustomEvent) {
        const { media: viewedMedia } = event.detail;
        dispatch('mediaView', { 
            media: viewedMedia, 
            allMedia: media,
            index: media.indexOf(viewedMedia)
        });
    }
</script>

{#if media && media.length > 0}
    <div class="media-list" bind:this={containerElement}>
        {#if visualMedia.length > 0}
            <div class="visual-media-group" style="width: {visualMedia.length === 1 ? mediaLayout.width + 'px' : '100%'}; height: {mediaLayout.height}px;">
                {#each mediaLayout.layout as item (item.item)}
                    <div
                        class="album-item"
                        style="left: {visualMedia.length === 1 ? item.x + 'px' : item.xPercent + '%'}; top: {item.y}px; width: {visualMedia.length === 1 ? item.width + 'px' : item.widthPercent + '%'}; height: {item.height}px;"
                    >
                        <MediaItem
                            media={visualMedia[item.item]}
                            width={visualMedia.length === 1 ? item.width : null}
                            height={visualMedia.length === 1 ? item.height : null}
                            isInAlbum={true}
                            {currentUserId}
                            {message}
                            on:mediaClick={handleMediaClick}
                            on:view={handleMediaView}
                        />
                    </div>
                {/each}
                
                {#if hasMoreVisual}
                    <div class="more-items">
                        <span>+{visualMedia.length - maxItems}</span>
                    </div>
                {/if}
            </div>
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
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
    }

    .visual-media-group {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: transparent;
        min-width: 50px;
        min-height: 30px;
        max-height: 1200px;
        width: 100%;
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

    .album-item :global(.media-item.in-album) {
        border-radius: 0;
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
        .media-list {
            gap: 6px;
        }
        
        .other-media-group {
            gap: 6px;
        }
    }

    @media (max-width: 480px) {
        .media-list {
            gap: 4px;
        }
        
        .other-media-group {
            gap: 4px;
        }
        
        .more-items {
            bottom: 4px;
            right: 4px;
            padding: 2px 6px;
            font-size: 10px;
        }
        
        .more-items-text {
            padding: 6px;
            font-size: 0.8rem;
        }
    }
</style>
