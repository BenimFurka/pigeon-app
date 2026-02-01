<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChatType, type ChatPreview } from '$lib/types/models';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Input from '$lib/components/shared/Input.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { makeRequest } from '$lib/api';
    import { chatKeys, useUploadChatAvatar } from '$lib/queries/chats';
    import type { ChatMember } from '$lib/types/models';

    export let chat: ChatPreview;
    export let isOpen = false;
    export let isCreator = false;
    export let myMembership: ChatMember | undefined;
    
    const dispatch = createEventDispatcher<{
        close: void;
        save: { chat: any };
        back: void;
    }>();

    const queryClient = useQueryClient();
    const avatarUploadMutation = useUploadChatAvatar();
    
    $: canEditChat = Boolean(isCreator || myMembership?.can_manage_chat);
    
    let name = '';
    let description = '';
    let isSubmitting = false;
    let error: string | null = null;
    let avatarError: string | null = null;
    let avatarInput: HTMLInputElement | null = null;
    let isInitialized = false;
    
    $: if (isOpen && chat && !isInitialized && !isSubmitting) {
        name = chat.name || '';
        description = chat.description || '';
        isInitialized = true;
    }
    
    $: if (!isOpen) {
        isInitialized = false;
    }
    
    $: modalTitle = chat?.chat_type === ChatType.GROUP ? 'Редактировать группу' : 'Редактировать канал';
    
    const updateChatMutation = createMutation({
        mutationFn: async (data: { name?: string; description?: string }) => {
            const response = await makeRequest(`/chats/${chat.id}`, { data }, true, 'PUT');
            if (!response.data) {
                throw new Error('Failed to update chat');
            }
            return response.data;
        },
        onSuccess: (updatedChat: any) => {
            queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
            queryClient.setQueryData(chatKeys.detail(chat.id), updatedChat);
            name = updatedChat.name || '';
            description = updatedChat.description || '';
            dispatch('save', { chat: updatedChat });
        },
        onError: (err: any) => {
            error = err?.message || 'Failed to update chat';
        },
        onSettled: () => {
            isSubmitting = false;
        }
    });
    
    function handleClose() {
        if (!isSubmitting) {
            dispatch('close');
        }
    }
    
    function handleBack() {
        if (!isSubmitting) {
            dispatch('back');
        }
    }
    
    function handleSubmit(e: Event) {
        e.preventDefault();
        
        if (isSubmitting || !canEditChat) return;
        
        error = null;
        isSubmitting = true;
        
        const updates: { name?: string; description?: string } = {};
        
        if (name !== chat.name) {
            updates.name = name;
        }
        
        if (description !== chat.description) {
            updates.description = description;
        }
        
        if (Object.keys(updates).length > 0) {
            $updateChatMutation.mutate(updates);
        } else {
            dispatch('close');
        }
    }
    
    function handleDelete() {
        // TODO: Implement delete functionality
        console.log('Delete chat', chat.id);
    }
    
    function openAvatarPicker() {
        avatarInput?.click();
    }
    
    async function handleAvatarChange(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        avatarError = null;
        try {
            const updatedChat = await $avatarUploadMutation.mutateAsync({ chatId: chat.id, file });
            dispatch('save', { chat: updatedChat });
        } catch (error) {
            avatarError = error instanceof Error ? error.message : 'Не удалось загрузить аватар';
        } finally {
            target.value = '';
        }
    }
</script>

<Modal
    open={isOpen}
    title={modalTitle}
    showBack={true}
    maxWidth="500px"
    disabled={isSubmitting}
    on:close={handleClose}
    on:back={handleBack}
>
    <form on:submit={handleSubmit}>
        <div class="form-content">
            <div class="avatar-upload">
                <div class="avatar-preview">
                    <Avatar avatarUrl={chat.avatar_url} size="xlarge" />
                    <button 
                        type="button" 
                        class="change-avatar" 
                        disabled={isSubmitting || !canEditChat}
                        on:click={openAvatarPicker}
                    >
                        Изменить
                    </button>
                    <input
                        class="file-input"
                        type="file"
                        accept="image/*"
                        bind:this={avatarInput}
                        on:change={handleAvatarChange}
                    />
                    {#if avatarError}
                        <div class="avatar-error">
                            {avatarError}
                        </div>
                    {/if}
                </div>
            </div>
            
            <div class="form-group">
                <label for="chat-name">
                    {chat.chat_type === ChatType.GROUP ? 'Название группы' : 'Название канала'}
                </label>
                <Input
                    id="chat-name"
                    bind:value={name}
                    placeholder={chat.chat_type === ChatType.GROUP ? 'Название группы' : 'Название канала'}
                    disabled={isSubmitting || !canEditChat}
                    required
                />
            </div>
            
            <div class="form-group">
                <label for="chat-description">
                    {chat.chat_type === ChatType.GROUP ? 'Описание группы' : 'Описание канала'}
                </label>
                <textarea
                    id="chat-description"
                    bind:value={description}
                    placeholder={chat.chat_type === ChatType.GROUP ? 'Расскажите о группе' : 'Расскажите о канале'}
                    disabled={isSubmitting || !canEditChat}
                    rows={3}
                />
            </div>
            
            {#if error}
                <div class="error-message">
                    {error}
                </div>
            {/if}
        </div>
        
        <div>
            <Button type="submit" fullWidth disabled={isSubmitting || !canEditChat}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
            
            {#if chat.chat_type !== ChatType.DM && isCreator}
                <Button 
                    type="button" 
                    variant="danger" 
                    fullWidth 
                    on:click={handleDelete}
                    disabled={isSubmitting}
                >
                    Удалить {chat.chat_type === ChatType.GROUP ? 'группу' : 'канал'}
                </Button>
            {/if}
        </div>
    </form>
</Modal>

<style>
    .form-content {
        display: flex;
        flex-direction: column;
    }
    
    .avatar-upload {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
    }
    
    .avatar-preview {
        position: relative;
        text-align: center;
    }
    
    .change-avatar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 12px;
        padding: 6px 12px;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: 4px;
        color: var(--color-text);
        font-size: 0.9rem;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    }
    
    .change-avatar:hover:not(:disabled) {
        background: var(--surface-glass);
        border-color: var(--color-accent);
    }
    
    .change-avatar:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .file-input {
        display: none;
    }
    
    .avatar-error {
        color: var(--color-danger);
        font-size: 0.85rem;
        margin-top: 8px;
        text-align: center;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--color-text);
    }
    
    textarea {
        width: 100%;
        padding: 10px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-bg-elevated);
        color: var(--color-text);
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
    }
    
    textarea:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .error-message {
        color: var(--color-danger);
        padding: 10px 12px;
        border-radius: 4px;
        margin-top: 16px;
        font-size: 0.9rem;
    }
    
    button {
        cursor: pointer;
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
