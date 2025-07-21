<script>
	import Input from "../Input.svelte";
	import Button from "../Button.svelte";

	export let title = '';
	export let sumbit = 'Отправить';
	export let fields = [];
	export let onSubmit = () => {};
	export let active = false;
</script>

<div>
  	<form on:submit|preventDefault={onSubmit} class={`${active ? 'active' : ''}`}>
		{#if title}
		<h2>{title}</h2>
		{/if}

		{#each fields as field}
		<Input
			label={field.label}
			id={field.id}
			type={field.type || 'text'}
			placeholder={field.placeholder}
			required={field.required}
			style="width: 100%; height: 40px;"
			bind:value={field.value}
		/>
		{/each}
		<Button text={sumbit} type="submit" style="width: 100%; margin: 20px 0px 0px 0px;"/>
  	</form>
</div>

<style>
	.active {
		display: block;
	}

	form {
		display: none;
	}
</style>