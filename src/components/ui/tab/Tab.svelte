<script>
	export let text = '';
	export let id = '';
	export let active = false;
	export let onTabClick = () => {};
</script>

<button id={id} class={`tab ${active ? 'active' : ''}`} on:click={onTabClick}>
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