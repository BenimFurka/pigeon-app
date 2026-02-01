<script lang="ts">
	export let noCenter: boolean = false;
	export let style: string = '';
</script>

<div 
	class="bar {noCenter ? 'no-center' : ''}"
	style={style}
	>
	<slot></slot>
</div>

<style>
    .bar {
        display: flex;
        min-width: 0;
        transition: var(--transition);
        gap: 8px;
        padding: 6px;
        background-image: 
          linear-gradient(var(--surface-glass), var(--surface-glass)),
          linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
        color: var(--color-text);
        height: 45px;
        align-items: center;
        justify-content: space-between;
    }

    .bar.no-center {
      padding-left: var(--radius-md);
      justify-content: flex-start;
    }
</style>