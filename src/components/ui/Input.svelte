<script lang="ts">
	export let label: string = '';
	export let id: string = '';
	export let type: string = 'text';
	export let placeholder: string = '';
	export let required: boolean = false;
	export let value: string = '';
	export let style: string = '';
</script>

<div class="input-group">
	{#if label}<label for={id}>{label}</label>{/if}
	{#if type === 'text'}
		<input
			type="text"
			id={id}
			placeholder={placeholder}
			required={required}
			bind:value={value}
			style={style}
		/>
	{:else if type === 'password'}
		<input
			type="password"
			id={id}
			placeholder={placeholder}
			required={required}
			bind:value={value}
			style={style}
		/>
	{:else if type === 'email'}
		<input
			type="email"
			id={id}
			placeholder={placeholder}
			required={required}
			bind:value={value}
			style={style}
		/>
	{/if}
</div>

<style>
	label {
		display: block;
		margin: 12px 0px 2px 6px;
		font-size: 0.8rem;
		color: var(--primary-color);
	}

	input {
        background: var(--secondary-color);
		border: none;
        border-radius: var(--radius-sm);
        color: var(--text-color);
        font-size: 14px;
        outline: none;
		padding-left: 6px;
		margin: auto;
        transition: var(--transition);
	}

	input:focus {
		outline: none;
		box-shadow: 0 0 0 2px var(--primary-color);
		border-color: var(--primary-color);
	}

	input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}
</style>

{#if !label}
	<style>
		.input-group {
			display: flex;
			gap: 6px;
			flex: 1;
		}
	</style>
{:else}
	<style>
		.input-group {
			display: flex;
			height: 72px;
			flex-direction: column;
			gap: 6px;
			flex: 1;
		}
	</style>
{/if}
