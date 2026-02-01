<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "$lib/components/layout/Bar.svelte";
    import MessageList from "$lib/components/shared/MessageList.svelte";
    import MessageInput from "$lib/components/shared/MessageInput.svelte";
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

    export let selectedChat: ChatPreview | null = null;
    export let onBack: () => void = () => {};
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;
    
    let chatQuery: CreateQueryResult<Chat, Error> | null = null;
    let chat: Chat | null = null;
    
    $: {
        if (selectedChat?.id && selectedChat.id > 0) {
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
    
    let replyToMessage: import("$lib/types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
    let showProfileModal = false;
    let profileUser: import("$lib/types/models").UserPublic | null = null;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    $: isEphemeralDm = Boolean(selectedChat && selectedChat.chat_type === ChatType.DM && selectedChat.id < 0);
    const createChat = useCreateChat();
    const dispatch = createEventDispatcher<{ select: { chat: ChatPreview } }>();
    let ephemeralText = '';
    
    function handleReply(event: CustomEvent) {
        replyToMessage = event.detail.message || null;
    }
    
    function handleClearReply() {
        replyToMessage = null;
    }
    
    function handleUserClick(event: CustomEvent) {
        profileUser = event.detail.user;
        showProfileModal = true;
    }
    
    function handleCloseProfileModal() {
        showProfileModal = false;
        profileUser = null;
    }
    
    function handleMessageToUser() {
        showProfileModal = false;
        if (profileUser?.id) {
            const ephemeralChat: ChatPreview = {
                id: -Number(profileUser.id),
                chat_type: ChatType.DM,
                name: null,
                description: null,
                avatar_url: null,
                is_public: false,
                member_count: 2,
                last_message: null,
                last_user: null,
                other_user: profileUser,
            } as any;
            dispatch('select', { chat: ephemeralChat });
        }
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
        chatId={selectedChat ? (isEphemeralDm ? null : Number(selectedChat.id)) : null}
        myMembership={myMembership}
        chatType={chat?.chat_type || selectedChat?.chat_type || null}
        on:reply={handleReply}
    />
    
    {#if selectedChat}
        {#if isEphemeralDm}
            <MessageInput 
                chatId={null}
                replyToMessage={replyToMessage}
                isMobile={isMobile}
                on:clearReply={handleClearReply}
                on:userClick={handleUserClick}
                on:ephemeralSend={({ detail }) => void sendEphemeralMessage(detail.content, detail.attachmentIds)}
            />
        {:else if (selectedChat?.chat_type === ChatType.DM) || myMembership?.can_send_messages}
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