<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { X } from 'lucide-svelte';

    export let open: boolean = false;
    export let title: string = '';
    export let zIndex: number = 1000;

    const dispatch = createEventDispatcher<{ close: void }>();

    function close() {
        dispatch('close');
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            close();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            close();
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeydown);
    });
</script>

{#if open}
<div class="modal-backdrop" style={`z-index: ${zIndex};`} on:click={handleBackdropClick}>
    <div class="modal-panel" role="dialog" aria-modal="true">
        <header class="modal-header">
            <h2>{title}</h2>
            <button class="close-button" type="button" on:click={close} aria-label="Закрыть">
                <X size={18} />
            </button>
        </header>
        <div class="modal-body">
            <slot></slot>
        </div>
    </div>
</div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .modal-panel {
        background: var(--secondary-color);
        border-radius: 12px;
        width: min(420px, 100%);
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px;
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--text-color);
    }

    .modal-header h2 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
    }

    .close-button {
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        width: 32px;
        height: 32px;
        transition: var(--transition);
    }

    .close-button:hover {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
    }

    .modal-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: var(--text-color);
    }
</style>
