<script lang="ts">
	export let text: string = '';
	export let type: "button" | "submit" | "reset" | null | undefined = 'button';
	export let disabled: boolean = false;
	export let style: string = '';
	export let onClick: (e: MouseEvent) => void = (e) => {};
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