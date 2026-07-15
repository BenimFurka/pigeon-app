<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Form from '$lib/components/shared/Form.svelte';
    import { ChatType, type ChatPreview, type UserPublic } from '$lib/types/models';
    import { useCreateChat } from '$lib/queries/chats';
    import type { InputItem } from '$lib/types/components';
    import { writable, derived } from 'svelte/store';
    import { useSearch } from '$lib/queries/search';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { _ } from 'svelte-i18n';
    import { Settings, Users } from 'lucide-svelte';

    // Props
    export let isOpen = false;
    export let initialChatType: ChatType = ChatType.GROUP;
    export let initialName: string = '';
    export let initialDescription: string = '';
    export let initialMemberIds: number[] = [];

    // Event dispatcher
    const dispatch = createEventDispatcher<{ 
        created: { chat: ChatPreview };
        close: void;
    }>();

    // Queries and stores
    const createChat = useCreateChat();
    const memberSearch = writable('');
    const debouncedMemberSearch = derived(memberSearch, ($value, set) => {
        const handle = setTimeout(() => set($value.trim()), 250);
        return () => clearTimeout(handle);
    }, '');
    const memberSearchQuery = useSearch(debouncedMemberSearch, { scope: 'users', limit: 5 });

    // State
    let chatType: ChatType = initialChatType;
    let name = initialName;
    let description = initialDescription;
    let isPublic = chatType !== ChatType.DM;
    let membersInput = initialMemberIds.join(', ');
    let selectedUsers: UserPublic[] = [];

    // Reactive statements
    $: if (chatType === ChatType.DM) {
        isPublic = false;
    }
    
    $: fields = getFormFields();
    $: isFormActive = !$createChat.isPending;

    // Event handlers
    function handleChatTypeChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        chatType = target.value as ChatType;
        
        fields = getFormFields();
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
        const combinedMemberIds = Array.from(new Set([...memberIds, ...selectedUsers.map((u) => u.id)]));

        if (chatType === ChatType.DM && combinedMemberIds.length !== 1) {
            alert($_('create_chat.specify_one_user'));
            return;
        }

        if (chatType !== ChatType.DM && name.trim().length === 0) {
            alert($_('create_chat.enter_chat_name'));
            return;
        }

        const payload = {
            chat_type: chatType,
            name: chatType === ChatType.DM ? undefined : name.trim(),
            description: description.trim() || undefined,
            is_public: isPublic,
            member_ids: combinedMemberIds,
        };

        try {
            const result = await $createChat.mutateAsync(payload);
            if (result) {
                dispatch('created', { chat: result });
                dispatch('close');
                if (chatType === ChatType.DM) {
                    membersInput = '';
                } else {
                    name = '';
                    description = '';
                    isPublic = true;
                    membersInput = '';
                }
                selectedUsers = [];
                memberSearch.set('');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Utility functions
    function getFormFields(): InputItem[] {
        const baseFields: InputItem[] = [
            {
                id: 'chat-type',
                label: $_('create_chat.chat_type'),
                type: 'select',
                value: chatType,
                onChange: handleChatTypeChange,
                options: [
                    { value: ChatType.DM, label: $_('create_chat.type_dm') },
                    { value: ChatType.GROUP, label: $_('create_chat.type_group') },
                    { value: ChatType.CHANNEL, label: $_('create_chat.type_channel') }
                ]
            }
        ];

        if (chatType !== ChatType.DM) {
            baseFields.push(
                {
                    id: 'chat-name',
                    label: $_('create_chat.name'),
                    type: 'text',
                    placeholder: $_('create_chat.name_placeholder'),
                    value: name,
                    required: true
                },
                {
                    id: 'chat-description',
                    label: $_('create_chat.description'),
                    type: 'text',
                    placeholder: $_('create_chat.description_placeholder'),
                    value: description
                },
                {
                    id: 'chat-public',
                    label: $_('create_chat.public'),
                    type: 'checkbox',
                    checked: isPublic
                }
            );
        }

        return baseFields;
    }

    function parseMemberIds(input: string): number[] {
        return input
            .split(',')
            .map((segment) => Number(segment.trim()))
            .filter((id) => !Number.isNaN(id) && id > 0);
    }

    function addUser(user: UserPublic) {
        if (!user?.id) return;
        if (selectedUsers.some((u) => u.id === user.id)) return;
        selectedUsers = [...selectedUsers, user];
        memberSearch.set('');
    }

    function removeUser(id: number) {
        selectedUsers = selectedUsers.filter((u) => u.id !== id);
    }
</script>

<Modal open={isOpen} title={$_('create_chat.create_chat')} on:close={() => dispatch('close')} zIndex={1200}>
    <div class="create-chat-content">
        <div class="create-chat-group">
            <div class="group-header">
                <Settings size={18} />
                <span>{$_('create_chat.chat_settings')}</span>
            </div>
            <Form
                submit={$createChat.isPending ? $_('create_chat.creating') : $_('create_chat.create_chat')}
                fields={fields}
                onSubmit={handleFormSubmit}
                active={isFormActive}
            />
        </div>
        
        <div class="create-chat-group">
            <div class="group-header">
                <Users size={18} />
                <span>{$_('create_chat.member_selection')}</span>
            </div>
            <div class="member-select">
                <label for="member-search">{$_('create_chat.add_member')}</label>
                <input
                    type="text"
                    placeholder={$_('create_chat.search_user_placeholder')}
                    bind:value={$memberSearch}
                    id="member-search"
                    class="member-search"
                />
                {#if $memberSearchQuery.isFetching}
                    <div class="hint">{$_('common.searching')}...</div>
                {:else if $memberSearchQuery.error}
                    <div class="hint error">{$_('create_chat.search_error')}: {String($memberSearchQuery.error)}</div>
                {:else if $memberSearchQuery.data?.users?.length}
                    <div class="search-results">
                        {#each $memberSearchQuery.data.users as user (user.id)}
                            <button
                                type="button"
                                class="search-result"
                                on:click={() => addUser(user)}
                            >
                                <span class="name">{user.name || user.username}</span>
                                <span class="username">@{user.username}</span>
                            </button>
                        {/each}
                    </div>
                {:else if $memberSearch.trim().length >= 2}
                    <div class="hint muted">{$_('common.not_found')}</div>
                {/if}

                {#if selectedUsers.length}
                    <div class="selected">
                        {#each selectedUsers as user (user.id)}
                            <span class="chip">
                                {user.name || user.username}
                                <button type="button" on:click={() => removeUser(user.id)} aria-label={$_('common.remove')}>×</button>
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
        
        {#if $createChat.error}
            <div class="error">{String($createChat.error)}</div>
        {/if}
    </div>
</Modal>

<style>
    .create-chat-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .create-chat-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        border-radius: var(--radius-sm);
        background: var(--surface-glass);
    }

    .group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .error {
        color: var(--color-danger);
        font-size: 0.9rem;
        opacity: 0.85;
        text-align: right;
        margin: 4px 6px 0;
    }

    .member-select {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 12px;
    }

    .member-select > label {
        display: block;
        margin: 0 0 2px 6px;
        font-size: 0.8rem;
        color: var(--color-accent);
    }

    .member-search {
        box-sizing: border-box;
        background: var(--color-bg-elevated);
        border: none;
        border-radius: var(--radius-sm);
        color: var(--color-text);
        font-size: 14px;
        outline: none;
        padding-left: 8px;
        width: 100%;
        margin: auto;
        transition: var(--transition);
        display: flex;
        height: 40px;
    }

    .member-search:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--color-accent-soft);
        border-color: var(--color-accent);
    }

    .member-search::placeholder {
        color: var(--color-text-muted);
    }

    .search-results {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
    }

    .search-result {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--color-bg-elevated);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background-color 0.2s;
        border: none;
        color: var(--color-text);
        text-align: left;
        font-size: 0.9rem;
    }

    .search-result:hover {
        background-color: var(--color-accent);
    }

    .search-result .username {
        opacity: 0.7;
        font-size: 0.9em;
    }

    .selected {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--surface-glass);
        border-radius: var(--radius-sm);
        padding: 8px 10px;
    }

    .chip button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-weight: 700;
    }

    .hint {
        font-size: 0.85rem;
        opacity: 0.8;
    }

    .hint.muted {
        opacity: 0.6;
    }
</style>
