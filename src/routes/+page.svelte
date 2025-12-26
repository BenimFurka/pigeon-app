<script lang="ts">
    import { onMount } from 'svelte';
    import AuthLayout from '../layouts/AuthLayout.svelte';
    import LeftLayout from '../layouts/LeftLayout.svelte';
    import { loggedIn } from '../stores/auth';
    import RightLayout from '../layouts/RightLayout.svelte';
    import SettingsLayout from '../layouts/SettingsLayout.svelte';
    import Sidebar from '../layouts/Sidebar.svelte';
    import type { ChatPreview } from '../types/models';
    import { ChatType } from '../types/models';
    import { session } from '../lib/session';
    import '../stores/window';
    import Modal from '../components/ui/Modal.svelte';
    import CreateChatForm from '../components/chat/modals/CreateChatForm.svelte';
    import ConfigModal from '../components/chat/modals/ConfigModal.svelte';
    
    let inSettings: boolean = false;
    let isChatInfoOpen = false;
    let selectedChatForInfo: ChatPreview | null = null;
    let selectedChat: ChatPreview | null = null;
    let isMobile = false;
    let leftVisible = true;
    let rightVisible = true;
    let isCreateChatOpen = false;
    let createChatPreset: { chatType?: ChatType; memberIds?: number[] } = {};
    let createChatFormKey = 0;
    
    let showConfigModal = false;
    
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
            isMobile = window.innerWidth <= 576;
        }
    }

    function handleOpenChatInfo(event: CustomEvent) {
        selectedChatForInfo = event.detail.chat;
        isChatInfoOpen = true;
    }
    
    function closeChatInfo() {
        isChatInfoOpen = false;
        selectedChatForInfo = null;
    }
    
    onMount(() => {
        window.addEventListener('openChatInfo', handleOpenChatInfo as EventListener);
        
        updateViewportState();
        const handleResize = () => {
            const wasMobile = isMobile;
            updateViewportState();
            if (!isMobile && wasMobile) {
                inSettings = false;
            }
        };
        window.addEventListener('resize', handleResize);

        const handleKeyDown = (event: { ctrlKey: any; code: string; key: string; preventDefault: () => void; }) => {
        if (event.ctrlKey && (event.code === 'Backquote' || event.key === '`')) {
            event.preventDefault();
            showConfigModal = !showConfigModal;
        }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('openChatInfo', handleOpenChatInfo as EventListener);    
            window.removeEventListener('keydown', handleKeyDown);
        };
    });

    $: leftVisible = isMobile ? (!selectedChat && !inSettings) : true;
    $: rightVisible = isMobile ? (Boolean(selectedChat) && !inSettings) : true;

    function handleChatSelect(event: CustomEvent<{ chat: ChatPreview }>) {
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

    function openCreateChat(preset?: { chatType?: ChatType; memberIds?: number[] }) {
        createChatPreset = preset ? { ...preset } : {};
        createChatFormKey += 1;
        isCreateChatOpen = true;
    }

    function closeCreateChat() {
        isCreateChatOpen = false;
    }

    function handleChatCreated(event: CustomEvent<{ chat: ChatPreview }>) {
        const { chat } = event.detail;
        selectedChat = chat;
        isCreateChatOpen = false;
        if (isMobile) {
            inSettings = false;
        }
    }
</script>

{#if initialized && $loggedIn}
    <main class={`app ${isMobile ? 'mobile' : ''}`}>
        {#if !isMobile}
            <Sidebar inSettings={inSettings} onToggleSettings={toggleSettings} onOpenCreateChat={openCreateChat} />
        {/if}
        <LeftLayout
            onToggleSettings={toggleSettings}
            inSettings={inSettings}
            isMobile={isMobile}
            isVisible={leftVisible}
            on:select={handleChatSelect}
            onOpenCreateChat={openCreateChat}
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

    <Modal open={isCreateChatOpen} title="Создать чат" on:close={closeCreateChat} zIndex={1200}>
        <CreateChatForm
            initialChatType={createChatPreset.chatType ?? ChatType.GROUP}
            initialMemberIds={createChatPreset.memberIds ?? []}
            on:created={handleChatCreated}
        />
    </Modal>
{:else}
    <main class="auth">
        <AuthLayout></AuthLayout>
    </main>
{/if}

<ConfigModal
  open={showConfigModal}
  on:close={() => showConfigModal = false}
  on:save={() => { console.log("Config updated") }}
/>

<style>
	:global(:root) {
		--hue: 235;
		--radius-sm: 8px;
		--radius-md: 12px;
		--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		color-scheme: dark;
		--color-bg: hsl(var(--hue), 15%, 6%);
		--color-bg-elevated: hsl(var(--hue), 18%, 10%);
		--color-surface: hsl(var(--hue), 20%, 13%);

		--color-border: #333333;

		--color-text: #FAFAFA;
		--color-text-muted: rgba(250, 250, 250, 0.65);

		--color-accent: hsl(var(--hue), 45%, 52%);
		--color-accent-soft: hsla(var(--hue), 45%, 52%, 0.14);

		--color-danger: #ff4d4d;
		--color-danger-soft: rgba(255, 77, 77, 0.1);

		--color-success: #2ecc71;
		--color-online: var(--color-success);

		--surface-glass: rgba(255, 255, 255, 0.03);

		--hover-filter: brightness(0.9);
	}

	:global(:root[data-theme='dark']) {
		color-scheme: dark;

		--color-bg: hsl(var(--hue), 15%, 6%);
		--color-bg-elevated: hsl(var(--hue), 18%, 10%);
		--color-surface: hsl(var(--hue), 20%, 13%);

		--color-border: #333333;

		--color-text: #FAFAFA;
		--color-text-muted: rgba(250, 250, 250, 0.65);

		--color-accent: hsl(var(--hue), 45%, 52%);
		--color-accent-soft: hsla(var(--hue), 45%, 52%, 0.14);

		--color-danger: #ff4d4d;
		--color-danger-soft: rgba(255, 77, 77, 0.1);

		--color-success: #2ecc71;
		--color-online: var(--color-success);

		--surface-glass: rgba(255, 255, 255, 0.03);

		--hover-filter: brightness(0.9);
	}

	:global(:root[data-theme='light']) {
		color-scheme: light;

		--color-bg: #f3f4f6;
		--color-bg-elevated: #ffffff;
		--color-surface: #ffffff;

		--color-border: #e5e7eb;

		--color-text: #111827;
		--color-text-muted: #6b7280;

		--color-accent: hsl(var(--hue), 45%, 58%);
		--color-accent-soft: hsla(var(--hue), 45%, 58%, 0.14);

		--color-danger: #dc2626;
		--color-danger-soft: rgba(220, 38, 38, 0.08);

		--color-success: #16a34a;
		--color-online: var(--color-success);

		--surface-glass: rgba(15, 23, 42, 0.04);

		--hover-filter: brightness(0.96);
	}
	
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		display: flex;
		color: var(--color-text);
		background: var(--color-bg);
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
