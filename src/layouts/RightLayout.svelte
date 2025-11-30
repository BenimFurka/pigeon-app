<script lang="ts">
    import { onMount } from 'svelte';
    import Bar from "../components/ui/Bar.svelte";
    import MessageList from "../components/chat/MessageList.svelte";
    import MessageInput from "../components/chat/MessageInput.svelte";
    import { typing } from "../stores/typing";
    import type { Chat } from "../types/models";
    
    export let selectedChat: Chat | null = null;
    
    let replyToMessage: import("../types/models").Message | null = null;
    let rightLayoutElement: HTMLDivElement;
    
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
            // TODO: ChatList state
            selectedChat = null;
            replyToMessage = null;
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

<div id="right-layout" class="right-layout" bind:this={rightLayoutElement} tabindex="-1">
    <Bar noCenter={true}>
        <div class="chat-bar-text">
            <span id="chat-bar-name">{chatName}</span>
            {#if statusText}
                <span id="chat-bar-status">{statusText}</span>
            {/if}
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
    .chat-bar-text {
        display: flex;
        flex-direction: column;
        max-width: auto; 
        overflow: hidden; 
        line-height: 1.5;
    }

    .chat-bar-text span:not(:first-child) {
        color: var(--primary-color);
        font-size: 0.8em;
    }

    .right-layout {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        overflow: hidden;
        min-width: 0;
        outline: none;
    }
    
    .right-layout:focus {
        outline: none;
    }
</style>