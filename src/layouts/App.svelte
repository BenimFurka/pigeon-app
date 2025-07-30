<script lang="ts">
	import AuthLayout from "./AuthLayout.svelte";
	import LeftLayout from "./LeftLayout.svelte";
	import { loggedIn } from '../stores/auth';
    import RightLayout from "./RightLayout.svelte";
    import SettingsLayout from "./SettingsLayout.svelte";
</script>


{#if !$loggedIn}
<main>
	<AuthLayout></AuthLayout>
</main>
{:else}
<main class="app">
	<SettingsLayout></SettingsLayout>
	<LeftLayout></LeftLayout>
	<RightLayout></RightLayout>
</main>
{/if}

<style>
	.app {
		display: flex;
		width: 100%;
	}
	:global(:root) {
		--hue: 235;
		
		--primary-color: hsl(var(--hue), 45%, 52%);
		--secondary-color: hsl(var(--hue), 16%, 6%);

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
</style>
<!--
<style>
	:global(body) {
		font-family: 'Poppins', sans-serif;
		background: var(--secondary-color);
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		height: 100vh;
		margin: 0;
		transition: var(--transition);
		color: var(--text-color);
	}
</style>
{/if}-->