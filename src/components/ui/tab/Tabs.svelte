<script lang="ts">
    import type { TabItem } from "../../../types/components";
	import Tab from "./Tab.svelte";

	export let tabs: TabItem[] = [];
	export let onTabSelect: (id: string) => void = (id) => {};
</script>

<div class="tabs">
	{#each tabs as tab}
		<Tab
		text={tab.text}
		active={tab.active}
		onClick={() => onTabSelect(tab.id)}
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