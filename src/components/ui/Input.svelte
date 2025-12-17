<script lang="ts">
    export let label: string = '';
    export let id: string = '';
    export let name: string = id;
    export let type: 'text' | 'password' | 'email' | 'select' | 'checkbox' = 'text';
    export let placeholder: string = '';
    export let required: boolean = false;
    export let value: string = '';
    export let checked: boolean = false;
    export let options: Array<{ value: string; label: string }> = [];
    export let style: string = '';
    export let disabled: boolean = false;
</script>

<div class="input-group">
    {#if type === 'checkbox'}
        <label class="toggle-label" for={id}>
            {label}
            <input
                type="checkbox"
                id={id}
                name={name}
                {checked}
                style={style}
            />
        </label>
    {:else}
        {#if label}<label for={id}>{label}</label>{/if}
        {#if type === 'text'}
            <input
                type="text"
                id={id}
                name={name}
                placeholder={placeholder}
                required={required}
                bind:value
                {style}
                {disabled}
            />
        {:else if type === 'password'}
            <input
                type="password"
                id={id}
                name={name}
                placeholder={placeholder}
                required={required}
                bind:value
                {style}
                {disabled}
            />
        {:else if type === 'email'}
            <input
                type="email"
                id={id}
                name={name}
                placeholder={placeholder}
                required={required}
                bind:value
                {style}
                {disabled}
            />
        {:else if type === 'select'}
            <select
                id={id}
                name={name}
                required={required}
                    style={style}
                    disabled={disabled}
            >
                {#if placeholder}<option value="">{placeholder}</option>{/if}
                {#each options as option}
                    <option value={option.value} selected={value === option.value}>
                        {option.label}
                    </option>
                {/each}
            </select>
        {/if}
    {/if}
</div>

<style>
    label {
        display: block;
        margin: 12px 0px 2px 6px;
        font-size: 0.8rem;
        color: var(--primary-color);
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
    }

    select, input:not([type="checkbox"]) {
  		box-sizing: border-box;
        background: var(--secondary-color);
        border: none;
        border-radius: var(--radius-sm);
        color: var(--text-color);
        font-size: 14px;
        outline: none;
        padding-left: 8px;
        margin: auto;
        transition: var(--transition);
        width: 100%;
    }

    select:focus, input:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color);
        border-color: var(--primary-color);
    }

    input::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }
	.input-group:has(input[type="checkbox"]) .toggle-label {
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-right: 8px;
	}
</style>

{#if !label && type !== 'checkbox'}
    <style>
        .input-group {
            display: flex;
            gap: auto;
            flex: 1;
        }
    </style>
{:else}
    <style>
        .input-group {
            display: flex;
            height: 72px;
            flex-direction: column;
            gap: auto;
            flex: 1;
        }
    </style>
{/if}
