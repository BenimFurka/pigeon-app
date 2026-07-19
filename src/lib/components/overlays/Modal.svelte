<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { X, ArrowLeft, SquarePen } from 'lucide-svelte';
    import { _ } from 'svelte-i18n';

    // Props
    export let open: boolean = false;
    export let title: string = '';
    export let zIndex: number = 1000;
    export let showClose: boolean = true;
    export let showBack: boolean = false;
    export let showEdit: boolean = false;
    export let maxWidth: string = '500px';
    export let disabled: boolean = false;
    export let closeOnBackdrop: boolean = true;

    // Event dispatcher
    const dispatch = createEventDispatcher<{ close: void; back: void; edit: void }>();

    // Event handlers
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
        if (event.key === 'Escape') {
            event.preventDefault();
            if (closeOnBackdrop && !disabled) {
                close();
            }
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget && closeOnBackdrop && !disabled && window.innerWidth > 576) {
            close();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !disabled && open) {
            close();
        }
    }

    // Lifecycle hooks
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
>
    <div class="modal-panel" role="dialog" aria-modal="true" style={`max-width: ${maxWidth};`}>
        <header class="modal-header">
            <div class="modal-actions">
                {#if showBack}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={goBack} 
                        aria-label={$_('modal.back')}
                        disabled={disabled}
                    >
                        <ArrowLeft size={20} />
                    </button>
                {/if}
            </div>
            <h2 id="modal-title" class="no-text-select">{title}</h2>
            <div class="modal-actions" style="margin-left: auto;">
                {#if showEdit}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={edit} 
                        aria-label={$_('modal.edit')}
                        disabled={disabled}
                    >
                        <SquarePen size={18} />
                    </button>
                {/if}
                {#if showClose}
                    <button 
                        class="icon-button" 
                        type="button" 
                        on:click={close} 
                        aria-label={$_('modal.close')}
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
            linear-gradient(var(--surface-glass), var(--surface-glass)),
            linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
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
        display: flex;
        align-items: center;
        position: relative;
        color: var(--color-text);
    }

    .modal-actions {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .modal-header h2 {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        width: calc(100% - 160px);
        text-align: center;
        pointer-events: none;
    }

    .icon-button {
        background: none;
        border: none;
        padding: 8px;
        margin: -8px;
        color: var(--color-text);
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;
    }

    .icon-button:hover:not(:disabled) {
        background-color: var(--surface-glass);
        color: var(--color-text);
    }

    .icon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1;
        color: var(--color-text);
    }

    .modal-body::-webkit-scrollbar {
        width: 6px;
    }
    
    .modal-body::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .modal-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        transition: background 0.2s ease;
    }
    
    .modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
    
    .modal-body::-webkit-scrollbar-thumb:active {
        background: rgba(255, 255, 255, 0.4);
    }
    
    .modal-body {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }
    
    .modal-body:hover {
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    .modal-footer {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    @media (max-width: 576px) {
        .modal-backdrop {
            padding: 0;
            background-image: 
                linear-gradient(var(--surface-glass), var(--surface-glass)),
                linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
        }

        .modal-panel {
            max-width: 100%;
            height: 100vh;
            height: var(--window-height, 100vh);
            max-height: 100vh;
            min-height: 100%;
            box-shadow: none;
            background-image: none;
            background-color: var(--color-bg-elevated);
        }

        .modal-header {
            background-color: var(--surface-glass);
        }
    }
</style>
