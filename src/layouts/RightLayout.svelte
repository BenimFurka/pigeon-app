<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "../components/ui/Bar.svelte";
    import MessageList from "../components/chat/MessageList.svelte";
    import MessageInput from "../components/chat/MessageInput.svelte";
    import { typing } from "../stores/typing";
    import { presence } from "../stores/presence";
    import { get } from 'svelte/store';
    import { ChatType, type ChatPreview, type Chat } from "../types/models";
    import { formatLastSeen } from "../lib/datetime";
    import ChatHeader from '../components/chat/ChatHeader.svelte';
    import ChatAccessPrompt from '../components/chat/ChatAccessPrompt.svelte';
    import { useChat } from '../queries/chats';
    import { type CreateQueryResult } from '@tanstack/svelte-query';
    import { useCurrentProfile } from '../queries/profile';
    import ProfileModal from '../components/chat/modals/ProfileModal.svelte';

    export let selectedChat: ChatPreview | null = null;
    export let onBack: () => void = () => {};
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;
    
    let chatQuery: CreateQueryResult<Chat, Error> | null = null;
    let chat: Chat | null = null;
    
    $: {
        if (selectedChat?.id) {
            const query = useChat(selectedChat.id, {
                enabled: !!selectedChat,
            }) as CreateQueryResult<Chat, Error>;
            chatQuery = query;
            // @ts-expect-error - TypeScript cannot correctly infer the type of $chatQuery
            chat = $chatQuery?.data ?? null;
        } else {
            chatQuery = null;
            chat = null;
        }
    }
    
    const currentUserQuery = useCurrentProfile();
    $: currentUser = $currentUserQuery?.data || null;
    $: isCreator = Boolean(chat?.owner_id === currentUser?.id);
    $: myMembership = currentUser && chat?.members ? chat.members.find(m => m.user_id === currentUser.id) : undefined;
    $: isChatLoading = Boolean(chatQuery ? $chatQuery?.isLoading : false);
    
    let replyToMessage: import("../types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
    let showProfileModal = false;
    let profileUser: import("../types/models").UserPublic | null = null;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    
    function handleReply(event: CustomEvent) {
        replyToMessage = event.detail.message || null;
    }
    
    function handleClearReply() {
        replyToMessage = null;
    }
    
    function handleUserClick(event: CustomEvent) {
        console.log("2849023048234")
        profileUser = event.detail.user;
        showProfileModal = true;
    }
    
    function handleCloseProfileModal() {
        showProfileModal = false;
        profileUser = null;
    }
    
    function handleMessageToUser() {
        showProfileModal = false;
        // TODO: navigate to DM with this user or open message input
        console.log('Message to user:', profileUser?.username);
    }
    
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && selectedChat) {
            onBack();
            replyToMessage = null;
        }
    }
    
    function handleBackClick() {
        onBack();
        replyToMessage = null;
    }
    
    onMount(() => {
        if (rightLayoutElement) {
            rightLayoutElement.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            if (rightLayoutElement) {
                rightLayoutElement.removeEventListener('keydown', handleKeyDown);
            }
        };
    });
</script>

<div id="right-layout" class={`right-layout ${layoutVisibleClass}`} bind:this={rightLayoutElement} tabindex="-1">
    <Bar noCenter={true}>
        <ChatHeader
            chatPreview={selectedChat}
            chat={chat}
            isCreator={isCreator}
            myMembership={myMembership}
            isMobile={isMobile}
            on:back={handleBackClick}
            on:userClick={handleUserClick}
        />
    </Bar>
    
    <MessageList 
        chatId={selectedChat ? Number(selectedChat.id) : null}
        myMembership={myMembership}
        on:reply={handleReply}
    />
    
    {#if selectedChat}
        {#if myMembership?.can_send_messages}
            <MessageInput 
                chatId={Number(selectedChat.id)}
                replyToMessage={replyToMessage}
                isMobile={isMobile}
                on:clearReply={handleClearReply}
                on:userClick={handleUserClick}
            />
        {:else}
            <ChatAccessPrompt
                chat={chat}
                chatPreview={selectedChat}
                myMembership={myMembership}
                isChatLoading={isChatLoading}
            />
        {/if}
    {/if}
    
    {#if showProfileModal && profileUser}
        <ProfileModal 
            user={profileUser}
            isOpen={showProfileModal}
            on:close={handleCloseProfileModal}
            on:message={handleMessageToUser}
        />
    {/if}
</div>

<style>
    .right-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        overflow: hidden;
        min-width: 0;
        outline: none;
        transition: var(--transition);
        background: var(--color-bg)
    }
    
    .right-layout:focus {
        outline: none;
    }

    .right-layout.mobile-hidden {
        transform: translateX(100%);
        pointer-events: none;
    }

    .right-layout.mobile-visible {
        transform: translateX(0);
    }
</style>