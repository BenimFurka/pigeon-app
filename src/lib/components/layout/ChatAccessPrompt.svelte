<script lang="ts">
    import Button from '$lib/components/shared/Button.svelte';
    import { Loader2 } from 'lucide-svelte';
    import { ChatType, type Chat, type ChatPreview, type ChatMember } from '$lib/types/models';
    import { useJoinPublicChat } from '$lib/queries/chats';

    export let chat: Chat | null = null;
    export let chatPreview: ChatPreview | null = null;
    export let myMembership: ChatMember | undefined;
    export let isChatLoading: boolean = false;

    const joinChat = useJoinPublicChat();

    $: chatId = chat?.id ?? chatPreview?.id ?? null;
    $: chatType = chat?.chat_type ?? chatPreview?.chat_type ?? null;
    $: isGroup = chatType === ChatType.GROUP;
    $: isChannel = chatType === ChatType.CHANNEL;
    $: isPublic = chat?.is_public ?? chatPreview?.is_public ?? false;
    $: joinPending = Boolean($joinChat?.isPending);
    $: joinError = $joinChat?.error ? String($joinChat.error) : null;

    async function handleJoinClick() {
        if (!chatId || joinPending) return;
        try {
            await $joinChat.mutateAsync(chatId);
        } catch (error) {
            console.error(error);
        }
    }

    $: title = chat?.name ?? chatPreview?.name ?? null;
    $: fallbackTitle = chatId ? `Чат #${chatId}` : 'Чат';
    $: displayName = title?.trim().length ? title : fallbackTitle;
</script>

<div class="prompt">
    {#if isChatLoading}
        <div class="state loading">
            <Loader2 size={18} />
            <span>Загрузка информации о чате…</span>
        </div>
    {:else if !myMembership}
        {#if isPublic}
            <Button style="margin: 0px; padding: 0px"
                on:click={handleJoinClick}
                disabled={joinPending}
                fullWidth={true}>
                {#if joinPending}
                    <Loader2 size={16} />
                    <span>Присоединяем…</span>
                {:else if isChannel}
                    Подписаться
                {:else}
                    Вступить в группу
                {/if}
            </Button>
        {:else}
            <div class="state warning">
                <span>Это приватный чат. Получите приглашение у администратора.</span>
            </div>
        {/if}

        {#if joinError}
            <div class="state error">{joinError}</div>
        {/if}
    {:else if !myMembership.can_send_messages}
        {#if isGroup}
            <span class="info">Вы не можете писать сообщения в этой группе</span>
        {:else if isChannel}
            <span class="info">Скоро</span>
        {:else}
            <span class="info">Отправка сообщений недоступна</span>
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
        background: rgba(255, 193, 7, 0.1);
        color: #ffba3b;
    }

    .state.error {
        background: var(--color-danger-soft);
        color: var(--color-danger)
    }
    
    </style>
