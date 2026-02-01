<script lang="ts">
	import type { TabItem } from "$lib/types/components";
	import Tab from "./Tab.svelte";

	export let tabs: TabItem[] = [];
	export let onTabSelect: (id: string) => void = () => {};
	
	$: activeIndex = tabs.findIndex(t => t.active);	
	$: tabWidthPercent = tabs.length > 0 ? 100 / tabs.length : 100;
	$: sliderPosition = activeIndex === 0 ? 'start' : 
	                  activeIndex === tabs.length - 1 ? 'end' : 'middle';
	
	function handleTabClick(id: string) {
		const index = tabs.findIndex(t => t.id === id);
		if (index !== -1) {
			tabs = tabs.map((tab, i) => ({
				...tab,
				active: i === index
			}));
			
			onTabSelect(id);
		}
	}
</script>

<div class="tabs-container">
	<div class="tabs">
		{#each tabs as tab, i (tab.id)}
			<Tab
				text={tab.text}
				id={tab.id}
				active={tab.active}
				onClick={() => handleTabClick(tab.id)}
			/>
		{/each}
	</div>
	<div 
		class="slider"
		class:position-start={sliderPosition === 'start'}
		class:position-middle={sliderPosition === 'middle'}
		class:position-end={sliderPosition === 'end'}
		style="
			width: {tabWidthPercent}%;
			transform: translateX({activeIndex * 100}%);
		"
	></div>
</div>

<style>
	.tabs-container {
		position: relative;
		margin-bottom: 20px;
		background: none;
		border-radius: 8px;
	}
	
	.tabs {
		display: flex;
		position: relative;
		z-index: 1;
		border-radius: 8px;
		overflow: hidden;
	}
	
	.slider {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: var(--color-accent-soft);
		border-bottom: 2px solid var(--color-accent);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		z-index: 0;
		pointer-events: none;
	}
	
	.slider.position-start {
		border-radius: 8px 0 0 0;
	}
	
	.slider.position-middle {
		border-radius: 0;
	}
	
	.slider.position-end {
		border-radius: 0 8px 0 0;
	}
</style>