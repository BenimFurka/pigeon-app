<script lang="ts">
    import type { MessageAttachment } from '$lib/types/models';
    import AttachmentItem from './AttachmentItem.svelte';
    import { onMount, tick } from 'svelte';

    // Props
    export let attachments: MessageAttachment[];
    export let isOwn: boolean = false;

    // State
    let containerMaxWidth: number | null = null;
    let containerElement: HTMLElement;
    let mutationObserver: MutationObserver | null = null;

    // Computed values
    $: mediaAttachments = attachments.filter(attachment => {
        const mimeType = attachment.mime_type?.toLowerCase() || '';
        const fileType = attachment.file_type?.toLowerCase() || '';
        return fileType === 'image' || fileType === 'gif' || fileType === 'video' ||
               mimeType.startsWith('image/') || mimeType.startsWith('video/') ||
               fileType === 'gif' || mimeType.includes('gif');
    });

    $: documentAttachments = attachments.filter(attachment => {
        const mimeType = attachment.mime_type?.toLowerCase() || '';
        const fileType = attachment.file_type?.toLowerCase() || '';
        return !(fileType === 'image' || fileType === 'gif' || fileType === 'video' ||
                mimeType.startsWith('image/') || mimeType.startsWith('video/') ||
                fileType === 'gif' || mimeType.includes('gif'));
    });

    $: mediaLayout = calculateMediaLayout(mediaAttachments, containerMaxWidth);

    function calculateMediaLayout(attachments: MessageAttachment[], maxWidth: number | null) {
        if (!attachments.length || !maxWidth) {
            return { width: null, height: null, layout: [] };
        }

        const items = attachments.map(attachment => ({
            w: attachment.width || 200,
            h: attachment.height || 200
        }));

        const layout = createAlbumLayout({
            items,
            maxWidth,
            minWidth: 100,
            spacing: 2,
            maxHeight: maxWidth * 1.5,
            forMedia: true
        });

        return layout;
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
            const width = Math.min(item.w, maxWidth);
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

    const updateMaxWidth = async () => {
        if (containerElement) {
            const bubbleElement = containerElement.closest('.bubble.has-media');
            if (bubbleElement) {
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
                    
                    if (newMaxWidth !== containerMaxWidth) {
                        containerMaxWidth = newMaxWidth;
                    }
                    return true;
                }
            }
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
</script>

{#if attachments && attachments.length > 0}
    <div class="attachments-list" bind:this={containerElement}>
        {#if mediaAttachments.length > 0}
            <div class="media-group" style="width: {mediaLayout.width}px; height: {mediaLayout.height}px;">
                {#each mediaLayout.layout as item (item.item)}
                    <div 
                        class="album-item"
                        style="left: {item.x}px; top: {item.y}px; width: {item.width}px; height: {item.height}px;"
                    >
                        <AttachmentItem 
                            attachment={mediaAttachments[item.item]} 
                            {isOwn} 
                            width={item.width} 
                            height={item.height}
                        />
                    </div>
                {/each}
            </div>
        {/if}
        
        {#if documentAttachments.length > 0}
            <div class="documents-group">
                {#each documentAttachments as attachment (attachment.id)}
                    <AttachmentItem {attachment} {isOwn} />
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .attachments-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 8px;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
    }

    .media-group {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        background: transparent;
    }

    .album-item {
        position: absolute;
        overflow: hidden;
        border-radius: 8px;
    }

    .album-item :global(.attachment-container) {
        width: 100%;
        height: 100%;
    }

    .documents-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
    }
</style>


