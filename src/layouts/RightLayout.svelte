<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "../components/ui/Bar.svelte";
    import MessageList from "../components/chat/MessageList.svelte";
    import MessageInput from "../components/chat/MessageInput.svelte";
    import { typing } from "../stores/typing";
    import type { Chat } from "../types/models";
    import { ArrowLeft } from 'lucide-svelte';

    export let selectedChat: Chat | null = null;
    export let onBack: () => void = () => {};
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;
    
    let replyToMessage: import("../types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';
    $: chatName = selectedChat ? (selectedChat.name || `Чат #${selectedChat.id}`) : 'Выберите чат';
    $: typingUsers = selectedChat ? typing.getTypingUsers(Number(selectedChat.id)) : [];
    $: statusText = typingUsers.length > 0 ? 'Печатает...' : '';
    
    function handleReply(event: CustomEvent) {
        replyToMessage = event.detail.message || null;
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
        <div class="chat-bar">
            {#if isMobile}
                <button class="back-button" on:click={handleBackClick} aria-label="Назад к списку чатов">
                    <ArrowLeft size={18} />
                </button>
            {/if}
            <div class="chat-bar-text">
                <span id="chat-bar-name">{chatName}</span>
                {#if statusText}
                    <span id="chat-bar-status">{statusText}</span>
                {/if}
            </div>
        </div>
    </Bar>
    
    <MessageList 
        chatId={selectedChat ? Number(selectedChat.id) : null}
        on:reply={handleReply}
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
    .chat-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
    }

    .chat-bar-text {
        display: flex;
        flex-direction: column;
        max-width: 100%;
        overflow: hidden;
        line-height: 1.5;
    }

    .chat-bar-text span:not(:first-child) {
        color: var(--primary-color);
        font-size: 0.8em;
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
        background: var(--glass);
        color: rgba(255, 255, 255, 0.9);
    }

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