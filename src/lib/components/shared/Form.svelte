<script lang="ts">
    import Input from "$lib/components/shared/Input.svelte";
    import Button from "$lib/components/shared/Button.svelte";
    import type { InputItem } from "$lib/types/components";

    export let title: string = '';
    export let submit: string = 'Отправить';
    export let fields: InputItem[] = [];
    export let onSubmit: (e: SubmitEvent) => void = (e) => {};
    export let active = false;
    export let disabled = false;

    function handleSubmit(e: SubmitEvent) {
        if (!disabled) {
            onSubmit(e);
        } else {
            e.preventDefault();
        }
    }
</script>

<div>
    <form on:submit|preventDefault={handleSubmit} class={`${active ? 'active' : ''}`} class:disabled={disabled}>
        {#if title}
            <h2>{title}</h2>
        {/if}

        {#each fields as field, i}
            {#if field.type === 'text' || field.type === 'password' || field.type === 'email' || field.type === 'select'}
                <Input
                    label={field.label}
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={field.value}
                    options={field.type === 'select' ? field.options : undefined}
                    style="width: 100%; height: 40px;"
                />
            {:else if field.type === 'checkbox'}
                <Input
                    label={field.label}
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    checked={field.checked}
                />
            {/if}
        {/each}

        <slot name="additional-content"></slot>
        <Button type="submit" style="width: 100%; margin: 20px 0px 0px 0px;">
            {submit}
        </Button>
    </form>
</div>

<style>
    .active {
        display: flex;
        flex-direction: column;
    }

    form {
        display: none;
    }

    form.disabled {
        opacity: 0.7;
        pointer-events: none;
    }
    
    form.disabled * {
        cursor: not-allowed;
    }
</style>