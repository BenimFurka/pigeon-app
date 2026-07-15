<script lang="ts">
    import { connectionStatus, connectionLabelKey } from '$lib/stores/connection';
    import { WifiOff, Loader2 } from 'lucide-svelte';
    import { _ } from 'svelte-i18n';
    import { fly } from 'svelte/transition';

    $: status = $connectionStatus;
    $: visible = status !== 'connected';
    $: label = $_($connectionLabelKey);
</script>

{#if visible}
    <div
        class="connection-banner"
        class:connecting={status === 'connecting'}
        class:error={status === 'error' || status === 'disconnected'}
        transition:fly={{ y: 24, duration: 200 }}
        role="status"
        aria-live="polite"
    >
        <div class="icon-wrapper">
            {#if status === 'connecting'}
                <Loader2 size={18} class="spin" />
            {:else}
                <WifiOff size={18} />
            {/if}
        </div>
        
        <div class="text-wrapper">
            <span class="label">{label}</span>
        </div>
    </div>
{/if}

<style>
    .connection-banner {
        position: absolute;
        bottom: 16px;
        left: 16px;
        z-index: 9990;
        
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0; 
        padding: 11px; 
        border-radius: 10px;
        
        font-size: 0.8rem;
        font-weight: 500;
        pointer-events: auto;
        cursor: default;
        
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(10px);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        color: var(--color-text);
        
        transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                    gap 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    background 0.3s ease, 
                    border-color 0.3s ease;
    }

    .connection-banner:hover {
        padding: 11px 16px 11px 11px;
        justify-content: flex-start;
        gap: 8px;
    }

    .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .text-wrapper {
        max-width: 0;
        opacity: 0;
        overflow: hidden;
        white-space: nowrap;
        transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                    opacity 0.2s ease 0.1s;
    }

    .connection-banner:hover .text-wrapper {
        max-width: 200px; 
        opacity: 1;
    }

    .connection-banner.connecting {
        border-color: var(--color-warning);
        color: var(--color-warning);
    }

    .connection-banner.error {
        border-color: var(--color-danger);
        color: var(--color-danger);
    }

    .connection-banner :global(.spin) {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>