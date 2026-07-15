<script lang="ts">
    import { page } from '$app/stores';
    import { softNavigate } from '$lib/utils/softNavigation';
    import AuthLayout from '$lib/components/layout/AuthLayout.svelte';
    import LeftLayout from '$lib/components/layout/LeftLayout.svelte';
    import { loggedIn } from '$lib/stores/auth';
    import RightLayout from '$lib/components/layout/RightLayout.svelte';
    import Sidebar from '$lib/components/layout/Sidebar.svelte';
    import type { ChatPreview } from '$lib/types/models';
    import { ChatType } from '$lib/types/models';
    import { session } from '$lib/session';
    import '$lib/stores/window';
    import CreateChatForm from '$lib/components/forms/modals/CreateChatForm.svelte';
    import SettingsModal from '$lib/components/forms/modals/SettingsModal.svelte';
    import { requestChatOpen } from '$lib/stores/chatNavigation';
    import { activeChatId } from '$lib/stores/activeChat';
    import { onMount } from 'svelte';
    
    let selectedChat: ChatPreview | null = null;
    let isMobile = false;
    let leftVisible = true;
    let rightVisible = true;
    let isCreateChatOpen = false;
    let createChatPreset: { chatType?: ChatType; memberIds?: number[] } = {};
    let swipeDeltaX = 0;

    let showSettingsModal = false;
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

    function openChatFromRoute() {
        const chatId = Number($page.params.id);
        if (Number.isNaN(chatId)) {
            console.error('[RouteChat] Invalid chat ID:', $page.params.id);
            return;
        }
        requestChatOpen(chatId);
    }

    onMount(() => {
        updateViewportState();
        const handleResize = () => {
            updateViewportState();
        };
        window.addEventListener('resize', handleResize);

        const handleKeyDown = (event: { ctrlKey: any; code: string; key: string; preventDefault: () => void; }) => {
            if (event.ctrlKey && (event.code === 'Backquote' || event.key === '`')) {
                event.preventDefault();
                showSettingsModal = !showSettingsModal;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        openChatFromRoute();
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    });

    $: leftVisible = isMobile ? !selectedChat : true;
    $: rightVisible = isMobile ? Boolean(selectedChat) : true;
    $: activeChatId.set(selectedChat?.id != null && selectedChat.id > 0 ? selectedChat.id : null);

    function handleChatSelect(event: CustomEvent<{ chat: ChatPreview }>) {
        const { chat } = event.detail;
        selectedChat = chat;
        softNavigate(`/chats/${chat.id}`);
    }

    function handleBackToList() {
        selectedChat = null;
        softNavigate('/');
    }

    function handleSwipeStart(event: CustomEvent<{ deltaX: number }>) {
        swipeDeltaX = event.detail.deltaX;
    }

    function handleSwipeMove(event: CustomEvent<{ deltaX: number }>) {
        swipeDeltaX = event.detail.deltaX;
    }

    function handleSwipeEnd() {
        swipeDeltaX = 0;
    }

    function openSettings() {
        showSettingsModal = true;
    }

    function closeSettingsModal() {
        showSettingsModal = false;
    }

    function openCreateChat(preset?: { chatType?: ChatType; memberIds?: number[] }) {
        createChatPreset = preset ? { ...preset } : {};
        isCreateChatOpen = true;
    }

    function closeCreateChat() {
        isCreateChatOpen = false;
    }

    function handleChatCreated(event: CustomEvent<{ chat: ChatPreview }>) {
        const { chat } = event.detail;
        selectedChat = chat;
        isCreateChatOpen = false;
        softNavigate(`/chats/${chat.id}`);
    }
</script>

{#if initialized && $loggedIn}
    <main class={`app ${isMobile ? 'mobile' : ''}`}>
        {#if !isMobile}
            <Sidebar
                isSettingsOpen={showSettingsModal}
                onOpenSettings={openSettings}
                onOpenCreateChat={openCreateChat}
            />
        {/if}
        <LeftLayout
            onOpenSettings={openSettings}
            isSettingsOpen={showSettingsModal}
            isMobile={isMobile}
            isVisible={leftVisible}
            selectedChatId={selectedChat?.id ?? null}
            on:select={handleChatSelect}
            onOpenCreateChat={openCreateChat}
            {swipeDeltaX}
        />
        <RightLayout
            selectedChat={selectedChat}
            onBack={handleBackToList}
            isMobile={isMobile}
            isVisible={rightVisible}
            on:select={handleChatSelect}
            on:swipeStart={handleSwipeStart}
            on:swipeMove={handleSwipeMove}
            on:swipeEnd={handleSwipeEnd}
        />
    
    </main>

    <CreateChatForm
        isOpen={isCreateChatOpen}
        initialChatType={createChatPreset.chatType ?? ChatType.GROUP}
        initialMemberIds={createChatPreset.memberIds ?? []}
        on:created={handleChatCreated}
        on:close={closeCreateChat}
    />
{:else}
    <main class="auth">
        <AuthLayout></AuthLayout>
    </main>
{/if}

<SettingsModal
  open={showSettingsModal}
  on:close={closeSettingsModal}
  zIndex={1300}
/>

<style>
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		display: flex;
		color: var(--color-text);
		background: var(--color-bg);
		overflow: hidden;
		transition: var(--transition);
		scroll-behavior: auto;
		scrollbar-width: none;
	}

	:global(body)::-webkit-scrollbar {
		display: none;
	}

	* {
		box-sizing: border-box; 
	}

	.app {
		display: flex;
		width: 100%;
        max-height: var(--window-height);
        position: relative;
        overflow: hidden;
		scroll-behavior: auto;
		scrollbar-width: none;
        contain: layout style paint;
        backface-visibility: hidden;
        transform: translateZ(0);
	}

	.app::-webkit-scrollbar {
		display: none;
	}

    .app.mobile {
        flex-direction: row;
    }

    .right-layout-container {
        display: flex;
        flex: 1;
        height: 100%;
        min-width: 0;
        position: relative;
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
