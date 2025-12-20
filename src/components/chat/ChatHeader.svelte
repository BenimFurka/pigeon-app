<script lang="ts">
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { ChatType, type ChatPreview, type Chat } from '../../types/models';
    import { subscribeToPresence } from '$lib/presence';
    import Avatar from './Avatar.svelte';
    import ChatInfoModal from './modals/ChatInfoModal.svelte';
    import EditChatModal from './modals/EditChatModal.svelte';
    import ManageMembersModal from './modals/ManageMembersModal.svelte';
    import { ArrowLeft } from 'lucide-svelte';
    import { useChat } from '../../queries/chats';
    import { type CreateQueryResult } from '@tanstack/svelte-query';

    export let chatPreview: ChatPreview | null = null;
    
    let chatQuery: CreateQueryResult<Chat, Error> | null = null;
    let chat: Chat | null = null;

    $: {
        if (chatPreview?.id) {
            const query = useChat(chatPreview.id, {
                enabled: !!chatPreview,
            }) as CreateQueryResult<Chat, Error>;
            chatQuery = query;
            // @ts-expect-error - TypeScript cannot correctly infer the type of $chatQuery
            chat = $chatQuery?.data ?? null;
        } else {
            chatQuery = null;
            chat = null;
        }
    }
    
    export let isOnline = false;
    export let chatStatus: string | null = null;
    export let isMobile: boolean = false;
    
    let unsubscribePresence: (() => void) | null = null;
    
    const dispatch = createEventDispatcher<{
        back: void;
        search: void;
        menu: void;
    }>();
    
    let showChatInfo = false;
    let showEditChat = false;
    let showManageMembers = false;
    
    $: {
        if (unsubscribePresence) {
            unsubscribePresence();
            unsubscribePresence = null;
        }
        
        if (chatPreview?.chat_type === ChatType.DM && chatPreview.other_user?.id) {
            unsubscribePresence = subscribeToPresence(
                chatPreview.other_user.id,
                (online, lastSeen) => {
                    isOnline = online;
                    chatStatus = lastSeen;
                }
            );
        } else {
            chatStatus = chatPreview?.chat_type == ChatType.GROUP ? `${chatPreview.member_count} участников` : `${chatPreview?.member_count} подписчиков`;
        }
    }
    
    onDestroy(() => {
        if (unsubscribePresence) {
            unsubscribePresence();
        }
    });

    function handleBack() {
        dispatch('back');
    }
    
    function handleOpenChatInfo() {
        showChatInfo = true;
        console.log("123");
    }
    
    function handleCloseChatInfo() {
        showChatInfo = false;
    }
    
    function handleEditChat() {
        showChatInfo = false;
        showEditChat = true;
    }
    
    function handleManageMembers() {
        showChatInfo = false;
        showManageMembers = true;
    }
    
    function handleCloseEditChat() {
        showEditChat = false;
        showChatInfo = true;
    }
    
    function handleCloseManageMembers() {
        showManageMembers = false;
        showChatInfo = true;
    }
    
    function handleChatUpdated(updatedChat: any) {
        chatPreview = { ...chatPreview, ...updatedChat };
        showEditChat = false;
        showChatInfo = true;
    }
</script>

<div class="chat-header">
    <div class="header-left">

        {#if isMobile}
            <button class="back-button" on:click={handleBack} aria-label="Назад к списку чатов">
                <ArrowLeft size={18} />
            </button>
        {/if}
        {#if chatPreview}
        <div class="chat-info" role="button" tabindex="0" on:click={handleOpenChatInfo} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenChatInfo(); } }}>
            <div class="avatar-container">
                <Avatar avatarUrl={chatPreview.other_user && chatPreview.chat_type === "DM" ? chatPreview.other_user.avatar_url : chatPreview.avatar_url} />
                {#if chatPreview.chat_type === ChatType.DM && isOnline}
                    <span class="online-dot" title="В сети" />
                {/if}
            </div> 
            <div class="chat-details">
                <span class="chat-name">{chatPreview.other_user && chatPreview.chat_type === "DM" ? chatPreview.other_user.name : chatPreview.name}</span>
                {#if chatStatus}
                    <div class="chat-status" class:online={isOnline}>
                        {chatStatus}
                    </div>
                {/if}
            </div>
        </div>
        {/if}
    </div>
</div>

{#if chatPreview && chat}
    {#if showChatInfo}
        <ChatInfoModal 
            chat={chat}
            chatPreview={chatPreview} 
            isOpen={showChatInfo} 
            on:close={handleCloseChatInfo}
            on:edit={handleEditChat}
            on:manageMembers={handleManageMembers}
        />
    {/if}

    {#if showEditChat}
        <EditChatModal 
            chat={chatPreview} 
            isOpen={showEditChat} 
            on:close={handleCloseEditChat}
            on:save={({ detail }) => handleChatUpdated(detail.chat)}
        />
    {/if}

    {#if showManageMembers}
        <ManageMembersModal 
            chat={chat} 
            isOpen={showManageMembers} 
            on:close={handleCloseManageMembers}
        />
    {/if}
{/if}

<style>
    .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        top: 0;
        z-index: 10;
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .chat-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .avatar-container {
        position: relative;
    }
    
    .online-dot {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-online);
        border: 2px solid var(--color-bg-elevated);
    }
    
    .chat-details {
        display: flex;
        flex-direction: column;
    }
    
    .chat-name {
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.4;
    }
    
    .chat-status {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        line-height: 1.3;
    }
    
    .chat-status.online {
        color: var(--color-online);
    }
    
    .back-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: var(--transition);
    }

    .back-button:hover {
        background: var(--surface-glass);
        color: rgba(255, 255, 255, 0.9);
    }

    @media (min-width: 768px) {
        .back-button {
            display: none;
        }
    }
</style>
