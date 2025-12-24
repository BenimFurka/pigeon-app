<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let disabled: boolean = false;
	export let style: string = '';
	export let type: 'button' | 'reset' | 'submit' | null | undefined = 'button';
	export let variant: 'primary' | 'outline' | 'ghost' | 'danger' | 'text' = 'primary';
	export let size: 'small' | 'medium' | 'icon' | 'large' = 'medium';
	export let fullWidth: boolean = false;
	export let className: string = '';
	export let ariaLabel: string | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<button
	type={type}
	disabled={disabled}
	style={style}
	aria-label={ariaLabel}
	class={`btn ${variant} ${size} ${fullWidth ? 'full' : ''} ${className}`.trim()}
	on:click={(e) => {
		if (!disabled) {
			dispatch('click', e);
		}
	}}
>
	<slot></slot>
</button>

<style>
	.btn {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text);
		background-color: var(--color-accent);
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

	.btn:hover {
		filter: var(--hover-filter);
	}

	.btn:active {
		background-color: var(--color-accent);
	}

	.btn.outline {
		background: transparent;
		border: 1px solid var(--color-border, rgba(255,255,255,0.2));
	}

	.btn.ghost {
		background: transparent;
		color: inherit;
	}

	.btn.danger {
		background: var(--color-danger);
	}

	.btn.text {
		background: transparent;
		min-width: auto;
		padding: 6px 10px;
	}

	.btn.small {
		min-height: 32px;
		min-width: 64px;
		padding: 6px 10px;
		font-size: 13px;
	}

	.btn.icon {
		min-width: 0;
		min-height: 0;
		width: 36px;
		height: 36px;
		padding: 0;
	}

	.btn.full {
		width: 100%;
		display: inline-flex;
	}
</style>