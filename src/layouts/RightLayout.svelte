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
    
    let replyToMessage: import("../types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    
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
            isMobile={isMobile}
            on:back={handleBackClick}
            on:menu={handleMenu}
        />
    </Bar>
    
    <MessageList 
        chatId={selectedChat ? Number(selectedChat.id) : null}
        on:reply={handleReply}
    />
    
    {#if selectedChat}
        <MessageInput 
            chatId={Number(selectedChat.id)}
            replyToMessage={replyToMessage}
            isMobile={isMobile}
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