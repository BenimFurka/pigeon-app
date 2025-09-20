<script lang="ts">
	import Input from "../Input.svelte";
	import Button from "../Button.svelte";
    import type { InputItem } from "../../../types/components";

	export let title: string = '';
	export let submit: string = 'Отправить';
	export let fields: InputItem[]= [];
	export let onSubmit: (e: SubmitEvent) => void = (e) => {};
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
		<Button type="submit" style="width: 100%; margin: 20px 0px 0px 0px;">
			{submit}
		</Button>
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