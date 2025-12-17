<!-- TODO: for all modals: mobile -->
<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { X, ArrowLeft, Edit } from 'lucide-svelte';

    export let open: boolean = false;
    export let title: string = '';
    export let zIndex: number = 1000;
    export let showClose: boolean = true;
    export let showBack: boolean = false;
    export let showEdit: boolean = false;
    export let maxWidth: string = '500px';
    export let disabled: boolean = false;
    export let closeOnBackdrop: boolean = true;

    const dispatch = createEventDispatcher<{ close: void; back: void; edit: void }>();

    function close() {
        if (!disabled) {
            dispatch('close');
        }
    }

    function goBack() {
        if (!disabled) {
            dispatch('back');
        }
    }

    function edit() {
        if (!disabled) {
            dispatch('edit');
        }
    }

    function handleBackdropKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (closeOnBackdrop && !disabled) {
                close();
            }
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget && closeOnBackdrop && !disabled) {
            close();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !disabled) {
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
<div
    class="modal-backdrop"
    style={`z-index: ${zIndex};`}
    role="presentation"
    tabindex="-1"
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
    transition:fade
>
    <div class="modal-panel" role="dialog" aria-modal="true" style={`max-width: ${maxWidth};`}>
        <header class="modal-header">
            <div class="modal-actions">
                {#if showBack}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={goBack} 
                        aria-label="Назад"
                        disabled={disabled}
                    >
                        <ArrowLeft size={20} />
                    </button>
                {/if}
            </div>
            <h2 id="modal-title">{title}</h2>
            <div class="modal-actions">
                {#if showEdit}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={edit} 
                        aria-label="Редактировать"
                        disabled={disabled}
                    >
                        <Edit size={18} />
                    </button>
                {/if}
                {#if showClose}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={close} 
                        aria-label="Закрыть"
                        disabled={disabled}
                    >
                        <X size={20} />
                    </button>
                {/if}
            </div>
        </header>
        <div class="modal-body">
            <slot></slot>
        </div>
        {#if $$slots.footer}
            <div class="modal-footer">
                <slot name="footer"></slot>
            </div>
        {/if}
    </div>
</div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .modal-panel {
        background-image: 
            linear-gradient(var(--glass), var(--glass)),
            linear-gradient(var(--secondary-color), var(--secondary-color));
        border-radius: 8px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        display: flex;
        align-items: center;
        position: relative;
        color: var(--text-color, #fff);
    }

    .modal-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        flex: 1;
        text-align: center;
    }

    .icon-button {
        background: none;
        border: none;
        padding: 8px;
        margin: -8px;
        /* TODO: var (maybe rgba(255, 255, 255, 0.7))? */
        color: var(--text-color);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;
    }

    .icon-button:hover:not(:disabled) {
        background-color: var(--hover);
        color: var(--text-color);
    }

    .icon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        color: var(--text-color, #fff);
    }

    .modal-footer {
        padding: 16px;
        border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
</style>
