<script lang="ts">
    export let text: string = '';
    export let disabled: boolean = false;
    export let style: string = '';
    export let onClick: (e: MouseEvent) => void = (e) => {};
</script>

<button disabled={disabled} style={style} on:click={onClick}>
    {text}
</button>

<style>
    button {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        color: var(--primary-color);
        background: none;
        border: none;
        cursor: pointer;
        background-color: none;
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
        color: var(--primary-color);
        background: none;
    }
</style>