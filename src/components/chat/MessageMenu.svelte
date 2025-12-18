<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';

    export let x: number = 0;
    export let y: number = 0;
    export let isOpen: boolean = false;
    export let canEdit: boolean = false;

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
    <button class="item" on:click={() => onAction('reply')}>Ответить</button>
    <button class="item" on:click={() => onAction('copy')}>Копировать</button>
    {#if canEdit}
        <button class="item" on:click={() => onAction('edit')}>Редактировать</button>
        <button class="item danger" on:click={() => onAction('delete')}>Удалить</button>
    {/if}
</div>
{/if}

<style>
    .menu {
        position: fixed;
        z-index: 1000;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        overflow: hidden;
        animation: fadeInScale 240ms ease-out;
        min-width: 180px;
    }

    .item {
        display: block;
        width: 100%;
        background: transparent;
        border: none;
        color: var(--color-text);
        text-align: left;
        padding: 10px 12px;
        cursor: pointer;
        transition: var(--transition);
        font-size: 14px;
    }

    .item:hover { background: var(--surface-glass); }
    .item.danger { color: var(--color-danger); }
    .item.danger:hover { filter: var(--hover-filter); }

    @keyframes fadeInScale {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
    }
</style>
