<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { Reply, Copy, Pencil, Trash2 } from 'lucide-svelte';

    export let x: number = 0;
    export let y: number = 0;
    export let isOpen: boolean = false;
    export let canReply: boolean = false;
    export let canEdit: boolean = false;
    export let canDelete: boolean = false;

    const dispatch = createEventDispatcher();
    let menuEl: HTMLDivElement | null = null;

    function handleOutsideClick(e: MouseEvent) {
        if (!menuEl) return;
        if (!menuEl.contains(e.target as Node)) {
            dispatch('close');
        }
    }

    function onAction(type: 'reply' | 'edit' | 'copy' | 'delete') {
        dispatch(type);
        dispatch('close');
    }

    onMount(() => {
        document.addEventListener('click', handleOutsideClick, { capture: true });
        document.addEventListener('contextmenu', handleOutsideClick, { capture: true });
        return () => {
            document.removeEventListener('click', handleOutsideClick, { capture: true } as any);
            document.removeEventListener('contextmenu', handleOutsideClick, { capture: true } as any);
        };
    });
</script>

{#if isOpen}
<div class="menu" bind:this={menuEl} style={`left:${x}px; top:${y}px`}>
    {#if canReply}
    <button class="item" on:click={() => onAction('reply')}>
        <Reply size={16} class="icon" />
        <span>Ответить</span>
    </button>
    {/if}
    <button class="item" on:click={() => onAction('copy')}>
        <Copy size={16} class="icon" />
        <span>Копировать</span>
    </button>
    {#if canEdit || canDelete}
        <div class="divider"></div>
        {#if canEdit}
        <button class="item edit" on:click={() => onAction('edit')}>
            <Pencil size={16} class="icon" />
            <span>Редактировать</span>
        </button>
        {/if}
        {#if canDelete}
        <button class="item danger" on:click={() => onAction('delete')}>
            <Trash2 size={16} class="icon" />
            <span>Удалить</span>
        </button>
        {/if}
    {/if}
</div>
{/if}

<style>
    .menu {
        position: fixed;
        z-index: 1000;
        background: var(--color-bg-elevated);
        border: none;
        border-radius: var(--radius-sm, 6px);
        backdrop-filter: blur(12px);
        overflow: hidden;
        animation: fadeInScale 240ms cubic-bezier(0.16, 1, 0.3, 1);
        min-width: 180px;
        padding: 4px;
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