<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "$lib/components/layout/Bar.svelte";
    import MessageList from "$lib/components/layout/MessageList.svelte";
    import MessageInput from "$lib/components/layout/MessageInput.svelte";
    import { ChatType, type ChatPreview, type Chat } from "$lib/types/models";
    import ChatHeader from '$lib/components/layout/ChatHeader.svelte';
    import ChatAccessPrompt from '$lib/components/layout/ChatAccessPrompt.svelte';
    import { useChat } from '$lib/queries/chats';
    import { type CreateQueryResult } from '@tanstack/svelte-query';
    import { useCurrentProfile } from '$lib/queries/profile';
    import ProfileModal from '$lib/components/forms/modals/ProfileModal.svelte';
    import { useCreateChat } from '$lib/queries/chats';
    import { createEventDispatcher } from 'svelte';
    import { session } from '$lib/session';
    import { setReadUpTo } from '$lib/stores/readReceipts';
    import { queryClient } from '$lib/query';
    import { chatKeys } from '$lib/queries/chats';
    import ChatInfoModal from '$lib/components/forms/modals/ChatInfoModal.svelte';
    import EditChatModal from '$lib/components/forms/modals/EditChatModal.svelte';
    import ManageMembersModal from '$lib/components/forms/modals/ManageMembersModal.svelte';

    // Props
    export let selectedChat: ChatPreview | null = null;
    export let onBack: () => void = () => {};
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;

    // Event dispatcher
    const dispatch = createEventDispatcher<{ select: { chat: ChatPreview } }>();

    // Queries and stores
    const currentUserQuery = useCurrentProfile();
    const createChat = useCreateChat();

    // State
    let chatQuery: CreateQueryResult<Chat, Error> | null = null;
    let chat: Chat | null = null;
    let replyToMessage: import("$lib/types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    let ephemeralText = '';

    // Modal states
    let showChatInfo = false;
    let showEditChat = false;
    let showManageMembers = false;
    let showAvatarProfile = false;
    let avatarProfileUser: import("$lib/types/models").UserPublic | null = null;

    // Computed values
    $: currentUser = $currentUserQuery?.data || null;
    $: isCreator = Boolean(chat?.owner_id === currentUser?.id);
    $: myMembership = currentUser && chat?.members ? chat.members.find(m => m.user_id === currentUser.id) : undefined;
    $: isChatLoading = Boolean(chatQuery ? $chatQuery?.isLoading : false);
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    $: isEphemeralDm = Boolean(selectedChat && selectedChat.chat_type === ChatType.DM && selectedChat.id < 0);
    $: chatContext = {
        selectedChat,
        chat,
        currentUser,
        isCreator,
        myMembership,
        isChatLoading,
        isMobile,
        isEphemeralDm,
        replyToMessage,
        onUserClick: handleUserClick,
        onReply: handleReply,
        onClearReply: handleClearReply,
        updateChatUnreadCount
    };

    // Reactive statements
    $: {
        if (selectedChat?.id && selectedChat.id > 0) {
            const query = useChat(selectedChat.id, {
                enabled: !!selectedChat,
            }) as CreateQueryResult<Chat, Error>;
            chatQuery = query;
            // @ts-expect-error - TypeScript cannot correctly infer type of $chatQuery
            chat = $chatQuery?.data ?? null;
            if (chat?.chat_type === ChatType.DM && currentUser && chat.members) {
                const other = chat.members.find((m) => m.user_id !== currentUser?.id);
                if (other?.last_read_message_id != null) {
                    setReadUpTo(selectedChat!.id, other.last_read_message_id);
                }
            }
        } else {
            chatQuery = null;
            chat = null;
        }
    }

    // TODO: future
    $: if (selectedChat?.id != null && selectedChat.id > 0) {
        updateChatUnreadCount(selectedChat.id, 0);
    }
    
    // Event handlers
    function handleUserClick(event: CustomEvent) {
        avatarProfileUser = event.detail.user;
        showAvatarProfile = true;
    }
    
    function handleCloseAvatarProfileModal() {
        showAvatarProfile = false;
        avatarProfileUser = null;
    }
    
    function handleOpenChatInfo() {
        showChatInfo = true;
    }
    
    function handleCloseChatInfo() {
        showChatInfo = false;
        showEditChat = false;
        showManageMembers = false;
    }
    
    function handleMessageFromDMChatInfo() {
        handleCloseChatInfo();
    }
    
    function handleEditChat() {
        showChatInfo = false;
        showEditChat = true;
    }
    
    function handleCloseEditChat() {
        showEditChat = false;
        showChatInfo = true;
    }
    
    function handleManageMembers() {
        showChatInfo = false;
        showManageMembers = true;
    }
    
    function handleCloseManageMembers() {
        showManageMembers = false;
        showChatInfo = true;
    }
    
    function handleChatUpdated(updatedChat: any) {
        if (selectedChat) {
            selectedChat = { ...selectedChat, ...updatedChat };
        }
        showEditChat = false;
        showChatInfo = true;
    }
    
    async function handleMessageToUser() {
        if (!avatarProfileUser?.id) return;
        
        const targetUser = avatarProfileUser;
        handleCloseAvatarProfileModal();
        handleCloseChatInfo();
        
        try {
            const result = await $createChat.mutateAsync({
                chat_type: ChatType.DM,
                is_public: false,
                member_ids: [targetUser.id],
            } as any);
            if (result?.id) {
                dispatch('select', { chat: result });
            }
        } catch (e) {
            const ephemeralChat: ChatPreview = {
                id: -Number(targetUser.id),
                chat_type: ChatType.DM,
                name: null,
                description: null,
                avatar_url: null,
                is_public: false,
                member_count: 2,
                last_message: null,
                last_user: null,
                other_user: targetUser,
            } as any;
            dispatch('select', { chat: ephemeralChat });
        }
    }
    
    function handleReply(event: CustomEvent) {
        replyToMessage = event.detail.message || null;
    }
    
    function handleClearReply() {
        replyToMessage = null;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            if (showAvatarProfile) {
                handleCloseAvatarProfileModal();
            } else if (showChatInfo || showEditChat || showManageMembers) {
                handleCloseChatInfo();
            } else if (selectedChat) {
                onBack();
                replyToMessage = null;
            }
        }
    }
    
    function handleBackClick() {
        onBack();
        replyToMessage = null;
    }

    // Utility functions
    function updateChatUnreadCount(chatId: number, unreadCount: number = 0, lastReadMessageId?: number) {
        queryClient.setQueryData<import('$lib/types/models').ChatPreview[] | undefined>(chatKeys.previews(), (prev) => {
            if (!prev) return prev;
            const idx = prev.findIndex((c) => Number(c.id) === Number(chatId));
            if (idx === -1) return prev;
            const chat = prev[idx];
            const next = [...prev];
            next[idx] = { 
                ...chat, 
                unread_count: unreadCount,
                ...(lastReadMessageId && { last_read_message_id: lastReadMessageId })
            };
            return next;
        });
    }

    async function sendEphemeralMessage(content: string, attachmentIds?: number[]) {
        if (!isEphemeralDm) return;
        const trimmed = content.trim();
        const otherId = selectedChat?.other_user?.id;
        if (!trimmed || !otherId) return;
        try {
            const result = await $createChat.mutateAsync({
                chat_type: ChatType.DM,
                is_public: false,
                member_ids: [otherId],
            } as any);
            if (result?.id) {
                dispatch('select', { chat: result });
                const ws = session.getWebSocket();
                if (ws) {
                    await ws.send({
                        type: 'send_message',
                        data: { 
                            chat_id: result.id, 
                            content: trimmed,
                            attachment_ids: attachmentIds && attachmentIds.length ? attachmentIds : undefined
                        }
                    });
                }
                ephemeralText = '';
            }
        } catch (e) {
            console.error('Failed to create DM and send message', e);
        }
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
            {chatContext}
            on:back={handleBackClick}
            on:openChatInfo={handleOpenChatInfo}
        />
    </Bar>
    
    <MessageList 
        {chatContext}
        on:reply={handleReply}
    />
    
    {#if selectedChat}
        {#if isEphemeralDm}
            <MessageInput 
                {chatContext}
                chatId={null}
                on:ephemeralSend={({ detail }) => void sendEphemeralMessage(detail.content, detail.attachmentIds)}
            />
        {:else if (selectedChat?.chat_type === ChatType.DM) || myMembership?.can_send_messages || (selectedChat?.chat_type === ChatType.CHANNEL && isCreator)}
            <MessageInput 
                {chatContext}
                chatId={Number(selectedChat.id)}
            />
        {:else}
            <ChatAccessPrompt
                {chatContext}
            />
        {/if}
    {/if}
    
    {#if showAvatarProfile && avatarProfileUser}
        <ProfileModal 
            user={avatarProfileUser}
            isOpen={showAvatarProfile}
            on:close={handleCloseAvatarProfileModal}
            on:message={handleMessageToUser}
        />
    {/if}
    
    {#if selectedChat && (chat || selectedChat.chat_type === ChatType.DM)}
        {#if showChatInfo}
            {#if selectedChat.chat_type === ChatType.DM}
                {#if selectedChat.other_user}
                    <ProfileModal 
                        user={selectedChat.other_user}
                        isOpen={showChatInfo}
                        on:close={handleCloseChatInfo}
                        on:message={handleMessageFromDMChatInfo}
                    />
                {/if}
            {:else}
                <ChatInfoModal 
                    chat={chat}
                    chatPreview={selectedChat} 
                    isOpen={showChatInfo} 
                    on:close={handleCloseChatInfo}
                    on:edit={handleEditChat}
                    on:manageMembers={handleManageMembers}
                    on:userClick={handleUserClick}
                />
            {/if}
        {/if}

        {#if showEditChat}
            <EditChatModal 
                chat={selectedChat} 
                isOpen={showEditChat} 
                isCreator={isCreator}
                myMembership={myMembership}
                on:close={handleCloseEditChat}
                on:save={({ detail }) => handleChatUpdated(detail.chat)}
                on:back={handleCloseEditChat}
            />
        {/if}

        {#if showManageMembers}
            <ManageMembersModal 
                chat={chat} 
                isOpen={showManageMembers} 
                on:close={handleCloseManageMembers}
                on:back={handleCloseManageMembers}
                on:userClick={handleUserClick}
            />
        {/if}
    {/if}
</div>

<style>
    .right-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        overflow: visible; 
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
