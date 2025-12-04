<script lang="ts">
    export let disabled: boolean = false;
    export let style: string = '';
    export let onClick: (e: MouseEvent) => void = (e) => {};
</script>

<button disabled={disabled} style={style} on:click={onClick}>
    <slot></slot>
</button>

<style>
    button {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        color: var(--primary-color);
        background: none;
        border: none;
        cursor: pointer;
        transition: var(--transition);
        margin: 10px;
        display: inline-flex;
        touch-action: manipulation;
    }

    button:hover {
        filter: var(--hover);
    }

    button:active {
        color: var(--primary-color);
        background: none;
    }
</style>