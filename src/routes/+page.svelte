<script lang="ts">
    import { onMount } from 'svelte';
    import AuthLayout from '../layouts/AuthLayout.svelte';
    import LeftLayout from '../layouts/LeftLayout.svelte';
    import { loggedIn } from '../stores/auth';
    import RightLayout from '../layouts/RightLayout.svelte';
    import SettingsLayout from '../layouts/SettingsLayout.svelte';
    import Sidebar from '../layouts/Sidebar.svelte';
    import type { Chat } from '../types/models';
    import { session } from '../lib/session';
    import '../stores/window';
    
    let inSettings: boolean = false;
    let selectedChat: Chat | null = null;
    let isMobile = false;
    let leftVisible = true;
    let rightVisible = true;

    let initialized = false;

    if (!initialized) {
        initializeApp();
    }
    
    async function initializeApp() {
        try {
            await session.initialize();
            console.log("Session initialized");
        } catch (error) {
            console.error("Error in initialization:", error);
        }
        initialized = true;
    }

    function updateViewportState() {
        if (typeof window !== 'undefined') {
            isMobile = window.innerWidth <= 900;
        }
    }

    onMount(() => {
        updateViewportState();
        const handleResize = () => {
            const wasMobile = isMobile;
            updateViewportState();
            if (!isMobile && wasMobile) {
                inSettings = false;
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    $: leftVisible = isMobile ? (!selectedChat && !inSettings) : true;
    $: rightVisible = isMobile ? (Boolean(selectedChat) && !inSettings) : true;

    function handleChatSelect(event: CustomEvent<{ chat: Chat }>) {
        const { chat } = event.detail;
        selectedChat = chat;
        if (isMobile) {
            inSettings = false;
        }
    }

    function handleBackToList() {
        selectedChat = null;
    }

    function toggleSettings() {
        inSettings = !inSettings;
        if (isMobile && inSettings) {
            selectedChat = null;
        }
    }

    function closeSettings() {
        inSettings = false;
    }
</script>

{#if initialized && $loggedIn}
<main class={`app ${isMobile ? 'mobile' : ''}`}>
    {#if !isMobile}
        <Sidebar inSettings={inSettings} onToggleSettings={toggleSettings} />
    {/if}
    <LeftLayout
        onToggleSettings={toggleSettings}
        inSettings={inSettings}
        isMobile={isMobile}
        isVisible={leftVisible}
        on:select={handleChatSelect}
    />
    {#if !isMobile || selectedChat}
        <RightLayout
            selectedChat={selectedChat}
            onBack={handleBackToList}
            isMobile={isMobile}
            isVisible={rightVisible}
        />
    {/if}
    <SettingsLayout
        inSettings={inSettings}
        isMobile={isMobile}
        onClose={closeSettings}
    />
</main>
{:else}
<main class="auth">
    <AuthLayout></AuthLayout>
</main>
{/if}

<style>
	:global(:root) {
		--hue: 235;
		
		--primary-color: hsl(var(--hue), 35%, 50%);
		--secondary-color: hsl(var(--hue), 15%, 6%);

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
		color: var(--text-color);
		background: var(--secondary-color);
		overflow: hidden; 
		transition: var(--transition);
	}

	* {
		box-sizing: border-box; 
	}

	.app {
		display: flex;
		width: 100%;
        height: var(--window-height);
        position: relative;
        overflow: hidden;
	}

    .app.mobile {
        flex-direction: row;
    }

    @media (min-width: 901px) {
        .app {
            height: 100%;
        }
    }

	.auth {
		display: flex;
		flex-direction: column;
		place-content: center;
		place-items: center;
		width: 100%
	}
</style>
