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
        position: relative;
        transition: var(--transition);
        background-image: 
          linear-gradient(var(--glass), var(--glass)),
          linear-gradient(var(--secondary-color), var(--secondary-color));
        color: var(--text-color);
        height: 45px;
        margin: 0;
        align-items: center;
        justify-content: space-between;
    }

    .bar.no-center {
      padding-left: var(--radius-md);
      justify-content: flex-start;
    }
</style>