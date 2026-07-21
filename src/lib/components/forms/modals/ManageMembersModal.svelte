<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Input from '$lib/components/shared/Input.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { useQueryClient } from '@tanstack/svelte-query';
    import { useSearch } from '$lib/queries/search';
    import { presence, type PresenceRecord } from '$lib/stores/presence';
    import { writable } from 'svelte/store';
    import { UserMinus, Shield } from 'lucide-svelte';
    import type { Chat, ChatMember } from '$lib/types/models';
    import { useCurrentProfile } from '$lib/queries/profile';
    import { useAddMember, useRemoveMember } from '$lib/queries/chats';
    import MemberListItem from '$lib/components/shared/MemberListItem.svelte';
    import EditMemberPermissionsModal from './EditMemberPermissionsModal.svelte';
    import { formatLastSeen } from '$lib/datetime';
    import type { UserPublic } from '$lib/types/models';
    import { _, format } from 'svelte-i18n';
    import { Search, Users } from 'lucide-svelte';

    // Props
    export let chat: Chat;
    export let isOpen = false;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        back: void;
        userClick: { user: UserPublic };
    }>();

    // Queries and stores
    const queryClient = useQueryClient();
    const presenceStore = { subscribe: presence.subscribe };
    const currentUserQuery = useCurrentProfile();
    const searchQueryStore = writable('');
    const searchResults = useSearch(searchQueryStore, {
        scope: 'users',
    });

    // Mutations from queries
    const addMemberMutation = useAddMember();
    const removeMemberMutation = useRemoveMember();

    // State
    let searchQuery = '';
    let selectedUsers: any[] = [];
    let isSubmitting = false;
    let error: string | null = null;
    let presenceState: Record<number, PresenceRecord> = {};
    let editingMember: ChatMember | null = null;
    let isPermissionsModalOpen = false;
    
    // Reactive statements
    $: members = chat?.members || [];
    $: currentUser = $currentUserQuery?.data || null;
    $: myMembership = currentUser ? members.find(m => m.user_id === currentUser.id) : null;
    $: canManageMembers = Boolean(myMembership?.can_manage_members || chat?.owner_id === currentUser?.id);
    $: presenceState = $presenceStore ?? {};
    $: filteredSearchResults = ($searchResults.data?.users || []).filter((user: any) => 
        !members.some((m: any) => m.user_id === user.id)
    );
    
    $: if (searchQuery.trim().length >= 2) {
        searchQueryStore.set(searchQuery);
    }

    // Event handlers
    function handleClose() {
        if (!isSubmitting) {
            searchQuery = '';
            selectedUsers = [];
            error = null;
            dispatch('close');
        }
    }
    
    function handleBack() {
        if (!isSubmitting) {
            searchQuery = '';
            selectedUsers = [];
            error = null;
            dispatch('back');
        }
    }
    
    function handleSelectUser(user: any) {
        const index = selectedUsers.findIndex(u => u.id === user.id);
        if (index === -1) {
            selectedUsers = [...selectedUsers, user];
        } else {
            selectedUsers = selectedUsers.filter(u => u.id !== user.id);
        }
    }
    
    async function handleAddSelected() {
        if (!canManageMembers || selectedUsers.length === 0) return;
        error = null;
        isSubmitting = true;
        try {
            for (const user of selectedUsers) {
                await $addMemberMutation.mutateAsync({ chatId: chat.id, userId: user.id });
            }
            selectedUsers = [];
            searchQuery = '';
        } catch (e: any) {
            error = e?.message || $_('manage_members.add_members_error');
        } finally {
            isSubmitting = false;
        }
    }

    function handleRemoveMember(userId: number) {
        if (!canManageMembers || userId === chat.owner_id) return;
        error = null;
        $removeMemberMutation.mutate({ chatId: chat.id, userId });
    }

    function handleEditPermissions(member: ChatMember) {
        if (!canManageMembers || member.user_id === chat.owner_id) return;
        editingMember = member;
        isPermissionsModalOpen = true;
    }

    function handlePermissionsModalClose() {
        isPermissionsModalOpen = false;
        editingMember = null;
    }
    
    function handleUserClick(event: CustomEvent) {
        dispatch('userClick', event.detail);
    }

    // Utility functions
    function getPresenceRecord(userId: number) {
        return presenceState?.[userId];
    }

    function getStatusText(userId: number) {
        const record = getPresenceRecord(userId);
        if (record?.online) {
            return $_('chat_info.online');
        }
        return formatLastSeen(record?.lastSeenAt, $format) ?? $_('chat_info.offline');
    }
</script>

<Modal
    open={isOpen}
    title={$_('manage_members.manage_members')}
    showBack={true}
    maxWidth="500px"
    disabled={isSubmitting}
    on:close={handleClose}
    on:back={handleBack}
>
    <div class="manage-members-content">
        <div class="manage-members-group">
            <div class="group-header">
                <Search size={18} />
                <span>{$_('manage_members.add_members')}</span>
            </div>
            <div class="search-box">
                <Input
                    type="text"
                    bind:value={searchQuery}
                    placeholder={$_('manage_members.search_users_placeholder')}
                    disabled={isSubmitting}
                />
            </div>
            {#if selectedUsers.length > 0}
                <Button on:click={handleAddSelected} disabled={!canManageMembers || isSubmitting}>
                    {$_('manage_members.add_selected')} ({selectedUsers.length})
                </Button>
            {/if}
            
            {#if $searchResults.isLoading}
                <div class="loading">{$_('common.searching')}...</div>
            {:else if filteredSearchResults.length > 0}
                <div class="search-results">
                    {#each filteredSearchResults as user (user.id)}
                        <div
                            class={`search-result-item ${selectedUsers.some(u => u.id === user.id) ? 'selected' : ''}`}
                            on:click={() => handleSelectUser(user)}
                        >
                            <Avatar avatarUrl={user.avatar_url} size="small" />
                            <div class="user-info">
                                <div class="username">{user.username}</div>
                                <div class="full-name">{user.name || user.username}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else if searchQuery && !isSubmitting}
                <div class="no-results">
                    {$_('manage_members.no_users_found')}
                </div>
            {/if}
        </div>
        
        <div class="manage-members-group members-group">
            <div class="group-header">
                <Users size={18} />
                <span>{$_('manage_members.members')} ({members?.length || 0})</span>
            </div>
            
            {#if members.length === 0}
                <div class="no-members">
                    {$_('manage_members.no_members')}
                </div>
            {:else}
                <div class="members-list">
                    {#each members as m (m.user_id)}
                        <MemberListItem
                            userId={m.user_id}
                            role={m.role}
                            isOnline={Boolean(getPresenceRecord(m.user_id)?.online)}
                            statusText={getStatusText(m.user_id)}
                            on:userClick={handleUserClick}
                        >
                        <svelte:fragment slot="actions">
                            {#if canManageMembers && m.user_id !== chat.owner_id}
                                <div class="member-actions">
                                    <!-- TODO: Delete Button -->
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        style="min-width: 0; min-height: 0; padding: 0; width: 32px; height: 32px;"
                                        on:click={() => handleEditPermissions(m)}
                                        title={$_('manage_members.edit_permissions')}
                                    >
                                        <Shield size={16} />
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="small"
                                        style="min-width: 0; min-height: 0; padding: 0; width: 32px; height: 32px;"
                                        on:click={() => handleRemoveMember(m.user_id)}
                                        title={$_('manage_members.remove_member')}
                                    >
                                        <UserMinus size={16} />
                                    </Button>
                                </div>
                            {/if}

                                </svelte:fragment>
                        </MemberListItem>
                    {/each}
                </div>
            {/if}
        </div>
        
        {#if error}
            <div class="error-message">
                {error}
            </div>
        {/if}
    </div>
    
    <div slot="footer">
        <Button on:click={handleClose} variant="outline" fullWidth disabled={isSubmitting}>
            {$_('common.done')}
        </Button>
    </div>
</Modal>

{#if editingMember}
    <EditMemberPermissionsModal
        chatId={chat.id}
        member={editingMember}
        isOpen={isPermissionsModalOpen}
        on:close={handlePermissionsModalClose}
    />
{/if}

<style lang="scss">
    @import '../../../../styles/components/modal';

    .manage-members-content {
        @extend .modal-content;
    }

    .manage-members-group {
        @extend .modal-group;
    }

    .group-header {
        @extend .modal-group-header;
    }
    
    .search-section,
    .members-section {
        margin-bottom: 8px;
    }

    .search-box {
        @extend .search-box;
    }
    
    .search-results {
        @extend .search-results;
    }
    
    .search-result-item {
        @extend .search-result-item;
    }
    
    .search-results {
        @extend .search-results;
    }
    
    .bordered {
        @extend .bordered;
    }
    
    .full-name {
        @extend .full-name;
    }
    
    .no-results,
    .no-members {
        @extend .no-results;
    }

    .members-list {
        @extend .members-list;
    }
    
    .error-message {
        @extend .modal-error;
    }
    
    .loading {
        @extend .loading;
    }

    .member-actions {
        @extend .member-actions;
    }
</style>
