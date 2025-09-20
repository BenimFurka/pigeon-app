<script lang="ts">
	import AuthLayout from '../layouts/AuthLayout.svelte';
	import LeftLayout from '../layouts/LeftLayout.svelte';
	import { loggedIn } from '../stores/auth';
    import RightLayout from '../layouts/RightLayout.svelte';
    import SettingsLayout from '../layouts/SettingsLayout.svelte';
    import Sidebar from '../layouts/Sidebar.svelte';
    import { avatars } from '../stores/avatar';
    import { profiles } from '../stores/profile';
    import { session } from '../lib/session';
	import { page } from '$app/stores';
	let inSettings: boolean = false;

    let initialized = false;

    $: if ($page) {
        console.log("Page loaded, initializing session...");
        if (!initialized) {
            console.log("bpb");
            initializeApp();
        }
    }

    async function initializeApp() {
        try {
            await Promise.all([
                avatars.initializeCache(),
                profiles.initializeCache()
            ]);
            console.log("Caches initialized");
            await session.initializeWithAuth();
            console.log("Session initialized with auth check");
        } catch (error) {
            console.error("Error in initialization:", error);
        }
        initialized = true;
    }
</script>


{#if !$loggedIn && initialized}
<main class="auth">
	<AuthLayout></AuthLayout>
</main>
{:else if initialized}
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
