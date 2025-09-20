<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
	<link rel="stylesheet" href="/global.css" />
</svelte:head>

{@render children?.()}
