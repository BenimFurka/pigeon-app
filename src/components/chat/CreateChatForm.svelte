<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Form from '../ui/Form.svelte';
    import { ChatType, type Chat } from '../../types/models';
    import { useCreateChat } from '../../queries/chats';
    import type { InputItem } from '../../types/components';

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

    $: fields = getFormFields();
    
    function getFormFields(): InputItem[] {
        const baseFields: InputItem[] = [
            {
                id: 'chat-type',
                label: 'Тип чата',
                type: 'select',
                value: chatType,
                options: [
                    { value: ChatType.DM, label: 'Личный' },
                    { value: ChatType.GROUP, label: 'Группа' },
                    { value: ChatType.CHANNEL, label: 'Канал' }
                ]
            }
        ];

        if (chatType !== ChatType.DM) {
            baseFields.push(
                {
                    id: 'chat-name',
                    label: 'Название',
                    type: 'text',
                    placeholder: 'Введите название',
                    value: name,
                    required: true
                },
                {
                    id: 'chat-description',
                    label: 'Описание',
                    type: 'text',
                    placeholder: 'Краткое описание (необязательно)',
                    value: description
                },
                {
                    id: 'chat-public',
                    label: 'Публичный',
                    type: 'checkbox',
                    checked: isPublic
                }
            );
        }

        baseFields.push({
            id: 'chat-members',
            label: chatType === ChatType.DM ? 'Участник (ID)' : 'Участники (ID через запятую)',
            type: 'text',
            placeholder: chatType === ChatType.DM ? 'Например: 42' : 'Например: 2, 5, 8',
            value: membersInput,
            required: chatType === ChatType.DM
        });

        return baseFields;
    }

    $: isFormActive = !$createChat.isPending;

    const createChat = useCreateChat();

    function parseMemberIds(input: string): number[] {
        return input
            .split(',')
            .map((segment) => Number(segment.trim()))
            .filter((id) => !Number.isNaN(id) && id > 0);
    }

    async function handleFormSubmit(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        
        const newChatType = formData.get('chat-type') as ChatType;
        chatType = newChatType;
        
        if (chatType !== ChatType.DM) {
            name = (formData.get('chat-name') as string) || '';
            description = (formData.get('chat-description') as string) || '';
            isPublic = formData.get('chat-public') === 'on';
        }
        
        membersInput = (formData.get('chat-members') as string) || '';
        
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
                if (chatType === ChatType.DM) {
                    membersInput = '';
                } else {
                    name = '';
                    description = '';
                    isPublic = true;
                    membersInput = '';
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
</script>

<Form
    submit={$createChat.isPending ? 'Создание...' : 'Создать чат'}
    fields={fields}
    onSubmit={handleFormSubmit}
    active={isFormActive}
/>

{#if $createChat.error}
    <div class="error">{String($createChat.error)}</div>
{/if}

<style>
    .error {
        color: #ff4d4d;
        font-size: 0.9rem;
        opacity: 0.85;
        text-align: right;
        margin-top: 10px;
    }
</style>
