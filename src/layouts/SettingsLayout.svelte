<script lang="ts">
    import Bar from "../components/ui/Bar.svelte";
    import ClickText from "../components/ui/ClickText.svelte";

	export let inSettings: boolean = false;
</script>

<div class="settings-layout {!inSettings ? 'no-settings' : ''}" id="settings-layout">
	<Bar noCenter={true}>
		Настройки
	</Bar>
    <div class="settings-content">
        <ClickText>Тема</ClickText>
		
    </div>
</div>

<style>
	.settings-layout {
		display: flex;
		flex-direction: column;
        position: absolute;
        transform: translate(0%, 0px);

		min-height: 0;
		height: 100%;
		width: 300px;
		
        margin-left: 40px;
		z-index: 1;
   		overflow: hidden;
		background-image: 
			linear-gradient(var(--glass), var(--glass)),
			linear-gradient(var(--secondary-color), var(--secondary-color));

		transition: var(--transition);	
    }

	.settings-content {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.no-settings {
		transform: translate(-100%, 0px);
	}
</style>
