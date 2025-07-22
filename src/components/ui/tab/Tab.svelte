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
    .tab {
        flex: 1;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        color: var(--primary-color);
        transition: var(--transition);
        background: none;
        border: none;
        outline: none;
        font: inherit;
        border-bottom: 2px solid var(--glass);
    }
        
    .tab.active {
        color: var(--primary-color);
        background: hsla(var(--hue), 45%, 52%, 0.1);
        border-bottom: 2px solid hsla(var(--hue), 45%, 52%, 0.8);
    }

    .tab:hover:not(.active) {
        background-color: var(--glass);
    }
</style>