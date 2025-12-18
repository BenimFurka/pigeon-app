<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { get } from 'svelte/store';
    import Avatar from './Avatar.svelte';
    import Button from '../ui/Button.svelte';
    import Input from '../ui/Input.svelte';
    import Modal from '../ui/Modal.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { makeRequest } from '../../lib/api';
    import { useSearch } from '../../queries/search';
    import { presence } from '../../stores/presence';
    import { writable } from 'svelte/store';
    import type { Chat } from '../../types/models';
    import { useProfile } from '../../queries/profile';

    export let chat: Chat;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        back: void;
    }>();

    const queryClient = useQueryClient();
    const presenceStore = { subscribe: presence.subscribe };
    
    let searchQuery = '';
    let selectedUsers: any[] = [];
    let isSubmitting = false;
    let error: string | null = null;
    
    // TODO: members
    $: members = [];
    // TODO: profiles

    const searchQueryStore = writable('');
    const searchResults = useSearch(searchQueryStore, {
        scope: 'users',
        enabled: false
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
    
    // TODO: add and remove
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
            
            {#if $searchResults.isLoading}
                <div class="loading">Поиск...</div>
            {:else if filteredSearchResults.length > 0}
                <div class="search-results">
                    {#each filteredSearchResults as user (user.id)}
                        <div class="search-result-item" on:click={() => handleSelectUser(user)}>
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
                <!-- TODO: normalnaya realizatia -->
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
    
    .search-result-item:last-child {
        border-bottom: none;
    }
    
    .search-result-item:hover {
        background-color: var(--color-bg-elevated);
    }
    
    .user-info {
        flex: 1;
        min-width: 0;
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
