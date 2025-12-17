<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChatType, type ChatPreview } from '../../types/models';
    import Avatar from './Avatar.svelte';
    import Button from '../ui/Button.svelte';
    import Input from '../ui/Input.svelte';
    import Modal from '../ui/Modal.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { makeRequest } from '../../lib/api';

    export let chat: ChatPreview;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        save: { chat: any };
        back: void;
    }>();

    const queryClient = useQueryClient();
    
    let name = chat?.name || '';
    let description = chat?.description || '';
    let isSubmitting = false;
    let error: string | null = null;
    
    $: if (chat) {
        name = chat.name || '';
        description = chat.description || '';
    }
    
    $: modalTitle = chat?.chat_type === ChatType.GROUP ? 'Редактировать группу' : 'Редактировать канал';
    
    const updateChatMutation = createMutation({
        mutationFn: async (data: { name?: string; description?: string }) => {
            const response = await makeRequest(`chats/${chat.id}`, data, true, 'PATCH');
            if (!response.data) {
                throw new Error('Failed to update chat');
            }
            return response.data;
        },
        onSuccess: (updatedChat: any) => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            queryClient.invalidateQueries({ queryKey: ['chat', chat.id] });
            dispatch('save', { chat: updatedChat });
        },
        onError: (err: any) => {
            error = err?.message || 'Failed to update chat';
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
        
        if (isSubmitting) return;
        
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
                    <button type="button" class="change-avatar" disabled={isSubmitting}>
                        Изменить
                    </button>
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
            <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
            
            {#if chat.chat_type !== ChatType.DM}
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
        background: var(--secondary-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-color);
        font-size: 0.9rem;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    }
    
    .change-avatar:hover:not(:disabled) {
        background: var(--hover);
        border-color: var(--border-hover);
    }
    
    .change-avatar:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--text-color);
    }
    
    textarea {
        width: 100%;
        padding: 10px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-color);
        background: var(--secondary-color);
        color: var(--text-color);
        font-family: inherit;
        font-size: 0.95rem;
        resize: vertical;
    }
    
    textarea:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .error-message {
        /* TODO: var */
        color: #ff4d4d;
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
