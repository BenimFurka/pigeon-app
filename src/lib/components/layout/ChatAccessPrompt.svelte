<script lang="ts">
    import Button from '$lib/components/shared/Button.svelte';
    import { LoaderCircle } from 'lucide-svelte';
    import { ChatType, type Chat, type ChatPreview, type ChatMember } from '$lib/types/models';
    import { useJoinPublicChat } from '$lib/queries/chats';
    import { _ } from 'svelte-i18n';

    // Props
    export let chatContext: {
        selectedChat: ChatPreview | null;
        chat: Chat | null;
        myMembership: ChatMember | undefined;
        isChatLoading: boolean;
    };

    // Queries and stores
    const joinChat = useJoinPublicChat();

    // State
    let joinError: string | null = null;

    // Computed values
    $: chat = chatContext.chat;
    $: chatPreview = chatContext.selectedChat;
    $: myMembership = chatContext.myMembership;
    $: isChatLoading = chatContext.isChatLoading;
    $: chatId = chat?.id ?? chatPreview?.id ?? null;
    $: chatType = chat?.chat_type ?? chatPreview?.chat_type ?? null;
    $: isGroup = chatType === ChatType.GROUP;
    $: isChannel = chatType === ChatType.CHANNEL;
    $: isPublic = chat?.is_public ?? chatPreview?.is_public ?? false;
    $: joinPending = Boolean($joinChat?.isPending);
    $: joinError = $joinChat?.error ? String($joinChat.error) : null;

    // Event handlers
    async function handleJoinClick() {
        if (!chatId || joinPending) return;
        try {
            await $joinChat.mutateAsync(chatId);
        } catch (error) {
            console.error(error);
        }
    }
</script>

<div class="prompt">
    {#if isChatLoading}
        <div class="state loading">
            <LoaderCircle size={18} />
            <span>{$_('chat_access.loading_chat_info')}</span>
        </div>
    {:else if !myMembership}
        {#if isPublic}
            <Button style="margin: 0px; padding: 0px"
                on:click={handleJoinClick}
                disabled={joinPending}
                fullWidth={true}>
                {#if joinPending}
                    <span>{$_('chat_access.joining')}</span>
                {:else if isChannel}
                    {$_('chat_access.subscribe')}
                {:else}
                    {$_('chat_access.join_group')}
                {/if}
            </Button>
        {:else}
            <div class="state warning">
                <span>{$_('chat_access.private_chat')}</span>
            </div>
        {/if}

        {#if joinError}
            <div class="state error">{joinError}</div>
        {/if}
    {:else if !myMembership.can_send_messages}
        {#if isGroup}
            <span>{$_('chat_access.cannot_write_group')}</span>
        {:else if isChannel}
            <span class="info">{$_('chat_access.soon')}</span>
        {:else}
            <span>{$_('chat_access.messages_unavailable')}</span>
        {/if}
    {/if}
</div>

<style>
    .prompt {
        padding: 12px;
        border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }

    .info {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin: 0;
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        border-radius: var(--radius-sm, 8px);
        padding: 12px;
        min-height: 40px;
    }

    .state.loading {
        color: var(--color-text-muted, rgba(255, 255, 255, 0.65));
    }

    .state.warning {
        background: var(--color-warning-soft);
        color: var(--color-warning);
    }

    .state.error {
        background: var(--color-danger-soft);
        color: var(--color-danger)
    }
    
</style>
