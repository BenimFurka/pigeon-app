<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Input from '../ui/Input.svelte';
    import Button from '../ui/Button.svelte';
    import { ChatType, type Chat } from '../../types/models';
    import { useCreateChat } from '../../queries/chats';

    export let initialChatType: ChatType = ChatType.GROUP;
    export let initialName: string = '';
    export let initialDescription: string = '';
    export let initialMemberIds: number[] = [];

    const dispatch = createEventDispatcher<{ created: { chat: Chat } }>();

    let chatType: ChatType = initialChatType;
    let name = initialName;
    let description = initialDescription;
    let isPublic = chatType !== ChatType.DM;
    let membersInput = initialMemberIds.join(', ');

    $: if (chatType === ChatType.DM) {
        isPublic = false;
    }

    const createChat = useCreateChat();

    function parseMemberIds(input: string): number[] {
        return input
            .split(',')
            .map((segment) => Number(segment.trim()))
            .filter((id) => !Number.isNaN(id) && id > 0);
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        const memberIds = parseMemberIds(membersInput);

        if (chatType === ChatType.DM && memberIds.length !== 1) {
            alert('нет.');
            return;
        }

        if (chatType !== ChatType.DM && name.trim().length === 0) {
            alert('Введите название чата');
            return;
        }

        const payload = {
            chat_type: chatType,
            name: chatType === ChatType.DM ? undefined : name.trim(),
            description: description.trim() || undefined,
            is_public: isPublic,
            member_ids: memberIds,
        };

        try {
            const result = await $createChat.mutateAsync(payload);
            if (result) {
                dispatch('created', { chat: result });
            }
        } catch (error) {
            console.error(error);
        }
    }
</script>

<form class="create-chat-form" on:submit|preventDefault={handleSubmit}>
    <!-- TODO: Use Form -->
    <div class="field">
        <label for="chat-type">Тип чата</label>
        <select
            id="chat-type"
            bind:value={chatType}
            disabled={$createChat.isPending}
        >
            <option value={ChatType.DM}>Личный</option>
            <option value={ChatType.GROUP}>Группа</option>
            <option value={ChatType.CHANNEL}>Канал</option>
        </select>
    </div>

    {#if chatType !== ChatType.DM}
        <Input
            id="chat-name"
            label="Название"
            placeholder="Введите название"
            bind:value={name}
        />

        <Input
            id="chat-description"
            label="Описание"
            placeholder="Краткое описание (необязательно)"
            bind:value={description}
        />

        <div class="field toggle">
            <label for="chat-public">Публичный</label>
            <input
                id="chat-public"
                type="checkbox"
                bind:checked={isPublic}
                disabled={$createChat.isPending}
            />
        </div>

    {/if}

    <!-- TODO: maybe do with search? -->
    <Input
        id="chat-members"
        label={chatType === ChatType.DM ? 'Участник (ID)' : 'Участники (ID через запятую)'}
        placeholder={chatType === ChatType.DM ? 'Например: 42' : 'Например: 2, 5, 8'}
        bind:value={membersInput}
    />

    <div class="actions">
        <Button type="submit" disabled={$createChat.isPending}>
            {$createChat.isPending ? 'Создание...' : 'Создать чат'}
        </Button>
    </div>

    {#if $createChat.error}
        <div class="error">{String($createChat.error)}</div>
    {/if}
</form>

<style>
    .create-chat-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        color: var(--text-color);
    }

    select {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-sm);
        padding: 10px;
        color: var(--text-color);
        outline: none;
    }

    select:focus {
        border-color: var(--primary-color);
    }

    .field.toggle {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .actions {
        display: flex;
        justify-content: flex-end;
    }

    .error {
        color: #ff4d4d;
        font-size: 0.9rem;
        opacity: 0.85;
        text-align: right;
    }
</style>
