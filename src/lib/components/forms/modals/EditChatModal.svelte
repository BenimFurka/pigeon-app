<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChatType, type ChatPreview } from '$lib/types/models';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Input from '$lib/components/shared/Input.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import AvatarEditorModal from '$lib/components/forms/modals/AvatarEditorModal.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { makeRequest } from '$lib/api';
    import { chatKeys, useUploadChatAvatar } from '$lib/queries/chats';
    import type { ChatMember } from '$lib/types/models';
    import { _ } from 'svelte-i18n';
    import { Image as ImageIcon, Settings, Trash2 } from 'lucide-svelte';
    import Textarea from '$lib/components/shared/Textarea.svelte';

    // Props
    export let chat: ChatPreview;
    export let isOpen = false;
    export let isCreator = false;
    export let myMembership: ChatMember | undefined;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        save: { chat: any };
        back: void;
    }>();

    // Queries and stores
    const queryClient = useQueryClient();
    const avatarUploadMutation = useUploadChatAvatar();

    // Mutations
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
            error = err?.message || $_('edit_chat.update_error');
        },
        onSettled: () => {
            isSubmitting = false;
        }
    });

    // State
    let name = '';
    let description = '';
    let isSubmitting = false;
    let error: string | null = null;
    let avatarError: string | null = null;
    let isInitialized = false;
    let showAvatarEditor = false;
    let avatarEditFile: File | null = null;

    // DOM refs
    let avatarInput: HTMLInputElement | null = null;
    
    // Reactive statements
    $: canEditChat = Boolean(isCreator || myMembership?.can_manage_chat);
    $: modalTitle = chat?.chat_type === ChatType.GROUP ? $_('edit_chat.edit_group') : $_('edit_chat.edit_channel');
    
    $: if (isOpen && chat && !isInitialized && !isSubmitting) {
        name = chat.name || '';
        description = chat.description || '';
        isInitialized = true;
    }
    
    $: if (!isOpen) {
        isInitialized = false;
    }

    // Event handlers
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
    
    function handleAvatarChange(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        avatarError = null;
        avatarEditFile = file;
        showAvatarEditor = true;
        target.value = '';
    }

    async function handleAvatarEdited(event: CustomEvent<{ file: File }>) {
        avatarError = null;
        try {
            const updatedChat = await $avatarUploadMutation.mutateAsync({
                chatId: chat.id,
                file: event.detail.file
            });
            dispatch('save', { chat: updatedChat });
        } catch (error) {
            avatarError = error instanceof Error ? error.message : $_('edit_chat.avatar_upload_error');
        } finally {
            showAvatarEditor = false;
            avatarEditFile = null;
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
        <div class="edit-chat-content">
                <div class="avatar-upload">
                    <div class="avatar-preview">
                        <Avatar avatarUrl={chat.avatar_url} size="xlarge" />
                        <button 
                            type="button" 
                            class="change-avatar" 
                            disabled={isSubmitting || !canEditChat}
                            on:click={openAvatarPicker}
                        >
                            {$_('edit_chat.change_avatar')}
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
            
            <div class="edit-chat-group">
                <div class="group-header">
                    <Settings size={18} />
                    <span>{$_('edit_chat.chat_information')}</span>
                </div>
                <div class="form-group">
                    <label for="chat-name">
                        {chat.chat_type === ChatType.GROUP ? $_('edit_chat.group_name') : $_('edit_chat.channel_name')}
                    </label>
                    <Input
                        id="chat-name"
                        bind:value={name}
                        placeholder={chat.chat_type === ChatType.GROUP ? $_('edit_chat.group_name_placeholder') : $_('edit_chat.channel_name_placeholder')}
                        disabled={isSubmitting || !canEditChat}
                        required
                    />
                </div>
                
                <div class="form-group">
                    <label for="chat-description">
                        {chat.chat_type === ChatType.GROUP ? $_('edit_chat.group_description') : $_('edit_chat.channel_description')}
                    </label>
                    <Textarea
                        id="chat-description"
                        bind:value={description}
                        placeholder={chat.chat_type === ChatType.GROUP ? $_('edit_chat.group_description_placeholder') : $_('edit_chat.channel_description_placeholder')}
                        disabled={isSubmitting || !canEditChat}
                        rows={3}
                    />
                </div>
            </div>
            
            {#if error}
                <div class="error-message">
                    {error}
                </div>
            {/if}
        </div>
        
        <div class="edit-chat-group">
            <div class="group-header">
                <Settings size={18} />
                <span>{$_('edit_chat.actions')}</span>
            </div>
            <div>
                <Button type="submit" fullWidth disabled={isSubmitting || !canEditChat}>
                    {isSubmitting ? $_('edit_chat.saving') : $_('edit_chat.save_changes')}
                </Button>
                
                {#if chat.chat_type !== ChatType.DM && isCreator}
                    <Button 
                        type="button" 
                        variant="danger" 
                        fullWidth 
                        on:click={handleDelete}
                        disabled={isSubmitting}
                    >
                        {$_('edit_chat.delete')} {chat.chat_type === ChatType.GROUP ? $_('edit_chat.group') : $_('edit_chat.channel')}
                    </Button>
                {/if}
            </div>
        </div>
    </form>
</Modal>

{#if showAvatarEditor && avatarEditFile}
    <AvatarEditorModal
        open={showAvatarEditor}
        file={avatarEditFile}
        zIndex={1100}
        on:close={() => {
            showAvatarEditor = false;
            avatarEditFile = null;
        }}
        on:save={handleAvatarEdited}
    />
{/if}

<style lang="scss">
    @import '../../../../styles/components/modal';

    .edit-chat-content {
        @extend .modal-content;
    }

    .edit-chat-group {
        @extend .modal-group;
        margin-top: 16px;
    }

    .group-header {
        @extend .modal-group-header;
    }
    
    .avatar-upload {
        display: flex;
        justify-content: center;
        margin-bottom: 24px;
    }
    
    .avatar-preview {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
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
        @extend .file-input;
    }
    
    .avatar-error {
        color: var(--color-danger);
        font-size: 0.85rem;
        margin-top: 8px;
        text-align: center;
    }
    
    .form-group {
        @extend .form-group;
    }

    .error-message {
        @extend .modal-error;
        margin-top: 16px;
    }
    
    button {
        cursor: pointer;
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
