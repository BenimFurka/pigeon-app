<script lang="ts">
	export let text: string = '';
	export let id: string = '';
	export let active: boolean = false;
	export let onClick: (e: MouseEvent) => void = (e) => {};
</script>

<button id={id} class={`tab ${active ? 'active' : ''}`} on:click={onClick}>
  	{text}
</button>

<style>
    /* TODO: animation */
    .tab {
        flex: 1;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        color: var(--color-accent);
        transition: var(--transition);
        background: none;
        border: none;
        outline: none;
        font: inherit;
        border-bottom: 2px solid var(--surface-glass);
    }
        
    .tab.active {
        color: var(--color-accent);
        background: var(--color-accent-soft);
        border-bottom: 2px solid var(--color-accent);
    }

    .tab:hover:not(.active) {
        background-color: var(--surface-glass);
    }
</style>