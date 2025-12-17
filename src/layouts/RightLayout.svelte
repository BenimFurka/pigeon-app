<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "../components/ui/Bar.svelte";
    import MessageList from "../components/chat/MessageList.svelte";
    import MessageInput from "../components/chat/MessageInput.svelte";
    import { typing } from "../stores/typing";
    import { presence } from "../stores/presence";
    import { get } from 'svelte/store';
    import { ChatType, type ChatPreview } from "../types/models";
    import { formatLastSeen } from "../lib/datetime";
    import ChatHeader from '../components/chat/ChatHeader.svelte';

    export let selectedChat: ChatPreview | null = null;
    export let onBack: () => void = () => {};
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;
    
    let isOnline = false;
    let lastSeenText: string | null = null;
    
    let replyToMessage: import("../types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    $: typingUsers = selectedChat ? typing.getTypingUsers(Number(selectedChat.id)) : [];
    $: statusText = typingUsers.length > 0 ? 'Печатает...' : '';
    
    $: if (selectedChat) {
        if (selectedChat.chat_type === ChatType.DM && selectedChat.other_user) {
            const counterpartId = selectedChat.other_user.id as number | undefined;
            if (counterpartId) {
                const record = get(presence)[counterpartId];
                isOnline = Boolean(record?.online);
                lastSeenText = isOnline ? 'в сети' : formatLastSeen(record?.lastSeenAt ?? record?.updatedAt ?? null);
            } else {
                isOnline = false;
                lastSeenText = null;
            }
        } else if (selectedChat.chat_type === ChatType.GROUP) {
            const memberCount = selectedChat.member_count ?? 0;
            lastSeenText = `${memberCount} участников`;
        } else {
            const memberCount = selectedChat.member_count ?? 0;
            lastSeenText = `${memberCount} подписчиков`;
        }
    }
    
    // TODO: so much todos
    function handleReply(event: CustomEvent) {
        replyToMessage = event.detail.message || null;
    }
    
    function handleMenu() {
        // TODO: Implement menu functionality
        console.log('Menu clicked');
    }
    
    function handleClearReply() {
        replyToMessage = null;
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
            isOnline={isOnline}
            isMobile={isMobile}
            lastSeenText={statusText || lastSeenText}
            on:back={handleBackClick}
            on:menu={handleMenu}
        />
    </Bar>
    
    <MessageList 
        chatId={selectedChat ? Number(selectedChat.id) : null}
    />
    
    {#if selectedChat}
        <MessageInput 
            chatId={Number(selectedChat.id)}
            replyToMessage={replyToMessage}
            on:clearReply={handleClearReply}
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