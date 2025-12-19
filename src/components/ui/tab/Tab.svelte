<script lang="ts">
    export let text: string = '';
    export let id: string = '';
    export let active: boolean = false;
    export let onClick: (e: MouseEvent) => void = () => {};
</script>

<button 
    id={id} 
    class="tab"
    class:active
    on:click={onClick}
>
    {text}
</button>

<style>
    .tab {
        flex: 1;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        color: var(--color-accent);
        background: none;
        border: none;
        outline: none;
        font: inherit;
        border-bottom: 2px solid var(--surface-glass);
        transition: var(--transition), color ease 0.3s;
        position: relative;
        z-index: 1;
    }

    .tab.active {
        color: var(--color-text);
        background: none;
        border-bottom: 2px solid transparent;
    }

    .tab:hover:not(.active) {
        background-color: var(--surface-glass);
    }
</style>