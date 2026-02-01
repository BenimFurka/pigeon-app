<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Input from '$lib/components/shared/Input.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { useSearch } from '$lib/queries/search';
    import { presence, type PresenceRecord } from '$lib/stores/presence';
    import { writable } from 'svelte/store';
    import { UserMinus } from 'lucide-svelte';
    import type { Chat } from '$lib/types/models';
    import { useCurrentProfile } from '$lib/queries/profile';
    import { chatKeys } from '$lib/queries/chats';
    import MemberListItem from '$lib/components/shared/MemberListItem.svelte';
    import { formatLastSeen } from '$lib/datetime';
    import type { UserPublic } from '$lib/types/models';

    export let chat: Chat;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        back: void;
        userClick: { user: UserPublic };
    }>();

    const queryClient = useQueryClient();
    const presenceStore = { subscribe: presence.subscribe };
    
    let searchQuery = '';
    let selectedUsers: any[] = [];
    let isSubmitting = false;
    let error: string | null = null;
    
    $: members = chat?.members || [];
    const currentUserQuery = useCurrentProfile();
    $: currentUser = $currentUserQuery?.data || null;
    $: myMembership = currentUser ? members.find(m => m.user_id === currentUser.id) : null;
    $: canManageMembers = Boolean(myMembership?.can_manage_members || chat?.owner_id === currentUser?.id);

    let presenceState: Record<number, PresenceRecord> = {};
    $: presenceState = $presenceStore ?? {};

    function getPresenceRecord(userId: number) {
        return presenceState?.[userId];
    }

    function getStatusText(userId: number) {
        const record = getPresenceRecord(userId);
        if (record?.online) {
            return 'в сети';
        }
        return formatLastSeen(record?.lastSeenAt) ?? 'не в сети';
    }

    const searchQueryStore = writable('');
    const searchResults = useSearch(searchQueryStore, {
        scope: 'users',
    });
    
    $: filteredSearchResults = ($searchResults.data?.users || []).filter((user: any) => 
        !members.some((m: any) => m.user_id === user.id)
    );
    
    $: if (searchQuery.trim().length >= 2) {
        searchQueryStore.set(searchQuery);
    }
    
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
    
    const addMembersMutation = createMutation({
        mutationFn: async (userIds: number[]) => {
            const { makeRequest } = await import('$lib/api');
            const promises = userIds.map(userId =>
                makeRequest(`/chats/${chat.id}/members`, { data: { user_id: userId } }, true, 'POST')
            );
            const responses = await Promise.all(promises);
            if (responses.some(res => res.error)) throw new Error('Не удалось добавить участников');
            return responses.map(res => res.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat.id) });
            queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
            selectedUsers = [];
        },
        onError: (e: any) => {
            error = e?.message || 'Ошибка добавления участников';
        },
        onSettled: () => {
            isSubmitting = false;
        }
    });

    function handleAddSelected() {
        if (!canManageMembers || selectedUsers.length === 0) return;
        error = null;
        isSubmitting = true;
        const ids = selectedUsers.map(u => u.id);
        $addMembersMutation.mutate(ids);
    }

    const removeMemberMutation = createMutation({
        mutationFn: async (userId: number) => {
            const { makeRequest } = await import('$lib/api');
            const res = await makeRequest(`/chats/${chat.id}/members/${userId}`, null, true, 'DELETE');
            if ((res as any).error) throw new Error((res as any).error.message || 'Не удалось удалить участника');
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat.id) });
            queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
        },
        onError: (e: any) => {
            error = e?.message || 'Ошибка удаления участника';
        }
    });

    function handleRemoveMember(userId: number) {
        if (!canManageMembers || userId === chat.owner_id) return;
        error = null;
        $removeMemberMutation.mutate(userId);
    }
    
    function handleUserClick(event: CustomEvent) {
        dispatch('userClick', event.detail);
    }
</script>

<Modal
    open={isOpen}
    title="Управление участниками"
    showBack={true}
    maxWidth="500px"
    disabled={isSubmitting}
    on:close={handleClose}
    on:back={handleBack}
>
    <div class="content">
        <div class="search-section">
            <h3>Добавить участников</h3>
            <div class="search-box">
                <Input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Найти пользователей..."
                    disabled={isSubmitting}
                />
            </div>
            {#if selectedUsers.length > 0}
                <Button on:click={handleAddSelected} disabled={!canManageMembers || isSubmitting}>
                    Добавить выбранных ({selectedUsers.length})
                </Button>
            {/if}
            
            {#if $searchResults.isLoading}
                <div class="loading">Поиск...</div>
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
                    Пользователи не найдены
                </div>
            {/if}
        </div>
        
        <div class="members-section">
            <h3>Участники ({members?.length || 0})</h3>
            
            {#if members.length === 0}
                <div class="no-members">
                    В этом чате пока нет участников
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
                                
                                    <Button
                                        variant="danger"
                                        size="small"
                                        style="min-width: 0; min-height: 0; padding: 0; width: 32px; height: 32px;"
                                        on:click={() => handleRemoveMember(m.user_id)}
                                    >
                                        <UserMinus size="16" />
                                    </Button>
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
            Готово
        </Button>
    </div>
</Modal>

<style>
    .content {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }
    
    .search-section,
    .members-section {
        margin-bottom: 8px;
    }
    
    h3 {
        margin: 0 0 12px;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
    }
    
    .search-box {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
    }
    
    .search-results {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 12px;
    }
    
    .search-result-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-bottom: 1px solid var(--color-border);
        gap: 12px;
    }
    
    .username {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .full-name {
        font-size: 0.85rem;
        color: var(--color-text);
    }
    
    .no-results,
    .no-members {
        padding: 16px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 0.95rem;
    }

    .members-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 14px;
        overflow: hidden;
        border: 1px solid var(--color-border);
    }
    
    .error-message {
        color: var(--color-danger);
        padding: 10px 12px;
        border-radius: 4px;
        margin-top: 8px;
        font-size: 0.9rem;
    }
    
    .loading {
        padding: 16px;
        text-align: center;
        color: var(--color-text);
        font-size: 0.95rem;
    }
</style>
