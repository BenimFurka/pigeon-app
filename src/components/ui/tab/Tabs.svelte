<script>
	import Tab from "./Tab.svelte";
	export let tabs = [];
	export let onTabSelect = () => {};
</script>

<div class="tabs">
	{#each tabs as tab}
		<Tab
		text={tab.text}
		active={tab.active}
		onTabClick={() => onTabSelect(tab.id)}
		/>
	{/each}
</div>

<style>
    .tabs {
        display: flex;
        margin-bottom: 20px;
        border-radius: 8px;
        overflow: hidden;
    }
</style>