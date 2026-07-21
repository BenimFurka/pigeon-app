<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { useUpdateMemberPermissions } from '$lib/queries/chats';
    import type { ChatMember } from '$lib/types/models';
    import { _ } from 'svelte-i18n';

    // Props
    export let chatId: number;
    export let member: ChatMember;
    export let isOpen = false;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    // Mutation
    const updatePermissionsMutation = useUpdateMemberPermissions();

    // State
    let isSubmitting = false;
    let error: string | null = null;
    let tempPermissions: Partial<ChatMember> = {
        role: member.role,
        can_send_messages: member.can_send_messages,
        can_manage_messages: member.can_manage_messages,
        can_manage_members: member.can_manage_members,
        can_manage_chat: member.can_manage_chat,
    };

    // Event handlers
    function handleClose() {
        if (!isSubmitting) {
            dispatch('close');
        }
    }

    function handlePermissionToggle(permission: keyof ChatMember) {
        tempPermissions = {
            ...tempPermissions,
            [permission]: !tempPermissions[permission]
        };
    }

    async function handleSave() {
        error = null;
        isSubmitting = true;
        try {
            await $updatePermissionsMutation.mutateAsync({
                chatId,
                userId: member.user_id,
                permissions: tempPermissions
            });
            dispatch('close');
        } catch (e: any) {
            error = e?.message || $_('edit_permissions.update_error');
        } finally {
            isSubmitting = false;
        }
    }
</script>

<Modal
    open={isOpen}
    title={$_('edit_permissions.title')}
    maxWidth="450px"
    disabled={isSubmitting}
    on:close={handleClose}
>
    <div class="edit-permissions-content">
        <div class="permissions-list">
            <div class="permission-item">
                <label>
                    <input 
                        type="checkbox" 
                        class="custom-checkbox"
                        checked={tempPermissions.can_send_messages ?? false}
                        on:change={() => handlePermissionToggle('can_send_messages')} 
                    />
                    <div class="permission-info">
                        <div class="permission-label">{$_('edit_permissions.can_send_messages')}</div>
                        <div class="permission-description">{$_('edit_permissions.can_send_messages_desc')}</div>
                    </div>
                </label>
            </div>
            <div class="permission-item">
                <label>
                    <input 
                        type="checkbox" 
                        class="custom-checkbox"
                        checked={tempPermissions.can_manage_messages ?? false}
                        on:change={() => handlePermissionToggle('can_manage_messages')} 
                    />
                    <div class="permission-info">
                        <div class="permission-label">{$_('edit_permissions.can_manage_messages')}</div>
                        <div class="permission-description">{$_('edit_permissions.can_manage_messages_desc')}</div>
                    </div>
                </label>
            </div>
            <div class="permission-item">
                <label>
                    <input 
                        type="checkbox" 
                        class="custom-checkbox"
                        checked={tempPermissions.can_manage_members ?? false}
                        on:change={() => handlePermissionToggle('can_manage_members')} 
                    />
                    <div class="permission-info">
                        <div class="permission-label">{$_('edit_permissions.can_manage_members')}</div>
                        <div class="permission-description">{$_('edit_permissions.can_manage_members_desc')}</div>
                    </div>
                </label>
            </div>
            <div class="permission-item">
                <label>
                    <input 
                        type="checkbox" 
                        class="custom-checkbox"
                        checked={tempPermissions.can_manage_chat ?? false}
                        on:change={() => handlePermissionToggle('can_manage_chat')} 
                    />
                    <div class="permission-info">
                        <div class="permission-label">{$_('edit_permissions.can_manage_chat')}</div>
                        <div class="permission-description">{$_('edit_permissions.can_manage_chat_desc')}</div>
                    </div>
                </label>
            </div>
        </div>
        
        {#if error}
            <div class="error-message">
                {error}
            </div>
        {/if}
    </div>
    
    <div slot="footer">
        <div class="modal-footer">
            <Button on:click={handleClose} variant="outline" disabled={isSubmitting}>
                {$_('common.cancel')}
            </Button>
            <Button on:click={handleSave} disabled={isSubmitting}>
                {$_('common.save')}
            </Button>
        </div>
    </div>
</Modal>

<style lang="scss">
    @import '../../../../styles/components/modal';

    .edit-permissions-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .permissions-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .permission-item {
        display: flex;
        align-items: flex-start;
        padding: 12px;
        border-radius: 8px;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
    }

    .permission-item label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        width: 100%;
    }

    .permission-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .permission-label {
        font-weight: 500;
        font-size: 0.95rem;
    }

    .permission-description {
        font-size: 0.85rem;
        color: var(--color-text-muted);
    }

    .error-message {
        @extend .modal-error;
    }

    .modal-footer {
        @extend .modal-footer;
    }
</style>
