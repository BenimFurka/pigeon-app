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
		position: relative;
		flex: 1;

		border: none;
		border-radius: var(--radius-sm);
		
		margin: 0 auto; 
		padding: 10px 12px;
		
		background-color: var(--secondary-color);
		color: var(--text-color);
		transition: var(--transition);
		
		min-width: 0%;
		max-width: 100%;

		min-height: 24px;
		max-height: 36px;

		justify-self: center;
		font-size: 15px;
	}
		
	input:focus {
		outline: none;
	}
</style>

{#if !label}
	<style>
		.input-group {
			display: flex;
			flex: 1;
		}
	</style>
{/if}
