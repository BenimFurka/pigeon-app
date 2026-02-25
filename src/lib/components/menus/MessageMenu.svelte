<script lang="ts">
    import { createEventDispatcher, onMount, tick } from 'svelte';
    import { Reply, Copy, Pencil, Trash2 } from 'lucide-svelte';
    import { _ } from 'svelte-i18n';

    // Props
    export let x: number = 0;
    export let y: number = 0;
    export let isOpen: boolean = false;
    export let canReply: boolean = false;
    export let canEdit: boolean = false;
    export let canDelete: boolean = false;
    export let messageId: number | null = null;
    export let currentUserId: number | null = null;
    export let existingReactions: any[] = [];

    // Event dispatcher
    const dispatch = createEventDispatcher();

    // Constants
    const quickReactions = ['❤️', '😂', '😮', '😢', '👍'];

    // State
    let menuEl: HTMLDivElement | null = null;
    let adjustedX = x;
    let adjustedY = y;

    // Utility functions
    function adjustPosition() {
        if (!menuEl) return;

        const width = menuEl.offsetWidth;
        const height = menuEl.offsetHeight;

        let left = x;
        let top = y;

        if (top + height > window.innerHeight) {
            top = y - height;
        }
        if (top < 0) top = 0;

        if (left + width > window.innerWidth) {
            left = x - width;
        }
        if (left < 0) left = 0;

        adjustedX = left;
        adjustedY = top;
    }

    // Event handlers
    function handleOutsideClick(e: MouseEvent) {
        if (!menuEl || !isOpen) return;
        if (!menuEl.contains(e.target as Node)) {
            e.stopPropagation();
            dispatch('close');
        }
    }

    function handleContextMenu(e: MouseEvent) {
        if (!menuEl || !isOpen) return;
        
        const target = e.target as Node;
        if (!menuEl.contains(target)) {
            const messageElement = (target as Element).closest('[data-message-id]');
            if (!messageElement || messageElement.getAttribute('data-message-id') !== messageId?.toString()) {
                e.preventDefault();
                e.stopPropagation();
                dispatch('close');
            }
        }
    }

    function handleTouchStart(e: TouchEvent) {
        if (!menuEl || !isOpen) return;
        
        const target = e.target as Node;
        if (!menuEl.contains(target)) {
            const messageElement = (target as Element).closest('[data-message-id]');
            if (!messageElement || messageElement.getAttribute('data-message-id') !== messageId?.toString()) {
                e.stopPropagation();
                dispatch('close');
                
                if (typeof window !== 'undefined') {
                    (window as any).__menuJustClosed = true;
                    setTimeout(() => {
                        (window as any).__menuJustClosed = false;
                    }, 200);
                }
            }
        }
    }

    function onAction(type: 'reply' | 'edit' | 'copy' | 'delete') {
        dispatch(type);
        dispatch('close');
    }

    function onReaction(emoji: string) {
        const hasReaction = existingReactions.some(r => r.emoji === emoji && r.user_id === currentUserId);
        
        if (hasReaction) {
            dispatch('removeReaction', { emoji, messageId });
        } else {
            dispatch('addReaction', { emoji, messageId });
        }
        dispatch('close');
    }

    // Lifecycle hooks
    onMount(() => {
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
            document.addEventListener('contextmenu', handleContextMenu);
            document.addEventListener('touchstart', handleTouchStart);
        }, 100);
        
        window.addEventListener('resize', adjustPosition); 
        
        return () => {
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('resize', adjustPosition);
        };
    });

    // Reactive statements
    $: if (isOpen && menuEl) {
        tick().then(adjustPosition);
    }
</script>

{#if isOpen}
<div class="menu" bind:this={menuEl} style={`left: ${adjustedX}px; top: ${adjustedY}px`}>
    <div class="reactions-section">
        <div class="reactions-title">{$_('message_menu.reactions')}</div>
        <div class="reactions-grid">
            {#each quickReactions as emoji}
                {@const hasReaction = existingReactions.some(r => r.emoji === emoji && r.user_id === currentUserId)}
                <button 
                    class="reaction-btn" 
                    class:has-reaction={hasReaction}
                    on:click={() => onReaction(emoji)}
                    title={hasReaction ? $_('message_menu.remove_reaction') : $_('message_menu.add_reaction')}
                >
                    <span class="reaction-emoji">{emoji}</span>
                </button>
            {/each}
        </div>
        <div class="divider"></div>
    </div>
    
    {#if canReply}
    <button class="item" on:click={() => onAction('reply')}>
        <Reply size={16} class="icon" />
        <span>{$_('message_menu.reply')}</span>
    </button>
    {/if}
    <button class="item" on:click={() => onAction('copy')}>
        <Copy size={16} class="icon" />
        <span>{$_('message_menu.copy')}</span>
    </button>
    {#if canEdit || canDelete}
        <div class="divider"></div>
        {#if canEdit}
        <button class="item edit" on:click={() => onAction('edit')}>
            <Pencil size={16} class="icon" />
            <span>{$_('message_menu.edit')}</span>
        </button>
        {/if}
        {#if canDelete}
        <button class="item danger" on:click={() => onAction('delete')}>
            <Trash2 size={16} class="icon" />
            <span>{$_('message_menu.delete')}</span>
        </button>
        {/if}
    {/if}
</div>
{/if}

<style>
    .menu {
        position: fixed;
        z-index: 9999;
        background: var(--color-bg-elevated);
        border: none;
        border-radius: var(--radius-sm, 6px);
        backdrop-filter: blur(12px);
        overflow: hidden;
        animation: fadeInScale 240ms cubic-bezier(0.16, 1, 0.3, 1);
        min-width: 200px;
        padding: 4px;
    }

    .reactions-section {
        padding: 4px 0;
    }

    .reactions-title {
        padding: 4px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .reactions-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
        padding: 4px 12px;
    }

    .reaction-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: var(--transition);
        font-size: 18px;
        padding: 0;
    }

    .reaction-btn:hover {
        background: var(--surface-glass);
        transform: scale(1.1);
    }

    .reaction-btn.has-reaction {
        background: var(--color-accent);
        color: var(--color-button-text);
    }

    .reaction-btn.has-reaction:hover {
        background: var(--color-accent);
        opacity: 0.8;
        transform: scale(1.05);
    }

    .reaction-emoji {
        line-height: 1;
        display: block;
    }

    .item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        background: transparent;
        border: none;
        color: var(--color-text);
        text-align: left;
        padding: 8px 12px;
        border-radius: var(--radius-sm, 6px);
        cursor: pointer;
        transition: var(--transition);
        font-size: 14px;
        line-height: 1.4;
        font-weight: 450;
    }

    .item:hover {
        background: var(--surface-glass);
    }

    .item:active {
        transform: translateX(1px);
        filter: brightness(0.95);
    }

    .item.edit:hover {
        background: var(--color-accent-soft);
        color: var(--color-accent);
    }

    .item.danger:hover {
        background: var(--color-danger-soft);
        color: var(--color-danger);
    }

    .divider {
        height: 1px;
        background: var(--color-border);
        margin: 4px 0;
        border: none;
    }

    @keyframes fadeInScale {
        from { 
            opacity: 0; 
        }
        to { 
            opacity: 1; 
        }
    }
</style>