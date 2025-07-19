<script>
	export let text = '';
	export let type = 'button';
	export let disabled = false;
	export let style = '';
	export let onClick = () => {};
</script>

<button type={type} disabled={disabled} style={style} on:click={onClick}>
	{text}
</button>

<style>
	button {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		font-size: 14px;
		font-weight: 500;
		color: #FAFAFA;
		background-color: var(--primary-color);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		min-height: 40px;
		min-width: 80px;
		max-width: 100%;
		padding: 10px 16px;
		transition: var(--transition);
		margin: 10px;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	button:hover {
		filter: var(--hover);
	}

	button:active {
		background-color: var(--primary-color);
	}
</style>