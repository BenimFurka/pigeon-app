<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';

    // Props
    export let value: string = '';
    export let placeholder: string = '';
    export let disabled: boolean = false;
    export let rows: number = 1;
    export let maxHeight: number = 200;
    export let minHeight: number = 40;
    export let resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'none';
    export let name: string | undefined = undefined;
    export let id: string | undefined = undefined;
    export let required: boolean = false;
    export let autofocus: boolean = false;

    // Event dispatcher
    const dispatch = createEventDispatcher();

    // Refs
    let textareaElement: HTMLTextAreaElement;

    // Auto-resize
    function adjustTextareaHeight() {
        if (!textareaElement) return;
        
        const currentOverflow = textareaElement.style.overflowY;
        textareaElement.style.overflowY = 'hidden';
        textareaElement.style.height = 'auto';
        
        const scrollHeight = textareaElement.scrollHeight;
        
        if (!value.trim()) {
            textareaElement.style.height = `${minHeight}px`;
        } else {
            const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
            textareaElement.style.height = `${newHeight}px`;
            
            if (scrollHeight > maxHeight) {
                textareaElement.style.overflowY = 'auto';
            }
        }
        
        textareaElement.style.overflowY = currentOverflow;
    }

    // Event handlers
    function handleInput(event: Event) {
        adjustTextareaHeight();
        dispatch('input', event);
    }

    function handleChange(event: Event) {
        dispatch('change', event);
    }

    function handleFocus(event: FocusEvent) {
        dispatch('focus', event);
    }

    function handleBlur(event: FocusEvent) {
        dispatch('blur', event);
    }

    function handleKeyDown(event: KeyboardEvent) {
        dispatch('keydown', event);
    }

    // Lifecycle
    onMount(() => {
        if (autofocus && textareaElement) {
            textareaElement.focus();
        }
        adjustTextareaHeight();
    });

    // Reactive
    $: if (textareaElement) {
        adjustTextareaHeight();
    }
</script>

<textarea
    bind:this={textareaElement}
    bind:value
    {placeholder}
    {disabled}
    {name}
    {id}
    {required}
    rows={rows}
    class:resize-vertical={resize === 'vertical'}
    class:resize-horizontal={resize === 'horizontal'}
    class:resize-both={resize === 'both'}
    class:resize-none={resize === 'none'}
    on:input={handleInput}
    on:change={handleChange}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKeyDown}
    class="textarea text-select"
></textarea>

<style lang="scss">
    .textarea {
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 10px;
        color: var(--color-text);
        font-size: 14px;
        outline: none;
        transition: var(--transition);
        min-height: 40px;
        max-height: 200px;
        line-height: 1.4;
        box-sizing: border-box;
        overflow-y: hidden;
        overflow-x: hidden;

        &::-webkit-scrollbar {
            width: 4px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }

        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 2px;
            transition: background 0.2s ease;

            &:hover {
                background: rgba(255, 255, 255, 0.25);
            }

            &:active {
                background: rgba(255, 255, 255, 0.35);
            }
        }

        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.15) transparent;

        &:hover {
            scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
        }

        &:focus {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 2px var(--color-accent-soft);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        &::placeholder {
            color: var(--color-text-muted);
            opacity: 0.7;
        }

        &.resize-none {
            resize: none;
        }

        &.resize-vertical {
            resize: vertical;
        }

        &.resize-horizontal {
            resize: horizontal;
        }

        &.resize-both {
            resize: both;
        }
    }
</style>
