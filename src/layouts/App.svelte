<script lang="ts">
	import AuthLayout from "./AuthLayout.svelte";
	import LeftLayout from "./LeftLayout.svelte";
	import { loggedIn } from '../stores/auth';
    import RightLayout from "./RightLayout.svelte";
    import SettingsLayout from "./SettingsLayout.svelte";
    import Sidebar from "./Sidebar.svelte";
	export let inSettings: boolean = false;
</script>


{#if !$loggedIn}
<main class="auth">
	<AuthLayout></AuthLayout>
</main>
{:else}
<main class="app">
	<Sidebar bind:inSettings></Sidebar>
	<SettingsLayout bind:inSettings></SettingsLayout>
	<LeftLayout></LeftLayout>
	<RightLayout></RightLayout>
</main>
{/if}

<style>
	:global(:root) {
		--hue: 235;
		
		--primary-color: hsl(var(--hue), 45%, 52%);
		--secondary-color: hsl(var(--hue), 14%, 6%);

		--border-color: #333333;
		--text-color: #FAFAFA;

		--glass: rgba(255, 255, 255, 0.03);

		--hover: brightness(0.90);

		--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		
		--radius-sm: 8px;
		--radius-md: 12px;
	}
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		display: flex;
		padding: 0;
		margin: 0;
		color: var(--text-color);
		background: var(--secondary-color);
		width: 100%;
		height: 100%;
		position: relative; 
		overflow: hidden; 
		transition: var(--transition);
	}

	* {
		box-sizing: border-box; 
	}

	.app {
		display: flex;
		width: 100%;
	}

	.auth {
		display: flex;
		flex-direction: column;
		place-content: center;
		place-items: center;
		width: 100%
	}
</style>
