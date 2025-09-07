<script lang="ts">
    import { Settings } from "lucide-svelte";
    import Button from "../components/ui/Button.svelte";

	export let inSettings: boolean = false;
</script>    

<div class="sidebar">
	<Button
		style="min-width: 30px; width: 30px; background: transparent; border: none; padding: 0; margin: 0;"
		onClick={() => {
			inSettings = !inSettings;
		}}
	><Settings color={'rgba(255,255,255,0.4)'} /></Button>
</div>

<style>
    .sidebar {
        padding: 5px 0px 5px 0px;
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        max-width: 10%;    
        background-color: hsl(var(--hue), 4%, 10%);
        width: 40px;
        min-width: 0;
        height: 100%;
        z-index: 5;
    }
</style>
