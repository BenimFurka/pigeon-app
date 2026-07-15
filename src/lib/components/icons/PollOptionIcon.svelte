<script lang="ts">
    import { Circle, CircleCheck, CircleX, Square, SquareCheck, SquareX } from 'lucide-svelte';

    export let type: 'circle' | 'check' | 'x' | 'selected';
    export let multiple: boolean = false;
    export let size: number = 16;
</script>

{#if type === 'selected'}
    {#if multiple}
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="option-icon"
        >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <rect x="6" y="6" width="12" height="12" rx="1" ry="1" fill="currentColor" stroke="none"/>
        </svg>
    {:else}
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="option-icon"
        >
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>
        </svg>
    {/if}
{:else if type === 'check'}
    {#if multiple}
        <SquareCheck {size} class="option-icon" />
    {:else}
        <CircleCheck {size} class="option-icon" />
    {/if}
{:else if type === 'x'}
    {#if multiple}
        <SquareX {size} class="option-icon" />
    {:else}
        <CircleX {size} class="option-icon" />
    {/if}
{:else}
    {#if multiple}
        <Square {size} class="option-icon" />
    {:else}
        <Circle {size} class="option-icon" />
    {/if}
{/if}

<style lang="scss">
    .option-icon {
        flex-shrink: 0;
        color: rgba(255, 255, 255, 0.6);
    }
</style>