<script lang="ts">
    import Avatar from './Avatar.svelte';
    import { useProfile } from '../../queries/profile';
    import type { UserPublic } from '../../types/models';
    import { createEventDispatcher } from 'svelte';

    export let userId: number;
    export let role: string | null = null;
    export let statusText: string | null = null;
    export let isOnline: boolean = false;
    export let clickable = true;
    
    const dispatch = createEventDispatcher<{
        userClick: { user: UserPublic };
    }>();

    const profileQuery = useProfile(userId, { enabled: Boolean(userId) });

    let profile: UserPublic | null = null;

    $: profile = $profileQuery?.data || null;
    $: avatarUrl = profile?.avatar_url ?? null;
    $: displayName = profile?.name || profile?.username || `Пользователь #${userId}`;
    $: username = profile?.username ? `@${profile.username}` : null;
    
    function handleClick() {
        if (profile) {
            console.log('MemberListItem clicked:', profile);
            dispatch('userClick', { user: profile });
        }
    }
</script>

<div 
    class="member-item" 
    class:clickable
    on:click={handleClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
>
    <div class="member-main">
        <div class="avatar-wrapper">
            <Avatar {avatarUrl} size="small" />
            {#if isOnline}
                <span class="online-dot" title="В сети"></span>
            {/if}
        </div>
        <div class="member-text">
            <div class="name">{displayName}</div>
            <div class="meta">
                {#if username}
                    <span class="username">{username}</span>
                {/if}
                {#if role}
                    <span class="chip role">{role}</span>
                {/if}
                {#if statusText}
                    <span class="chip status {isOnline ? 'online' : ''}">{statusText}</span>
                {/if}
            </div>
        </div>
    </div>
    <div class="member-actions">
        <slot name="actions" />
    </div>
</div>

<style>
    .member-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing:border-box;
        gap: 12px;
        width: 100%;
        padding: 8px;
        border-radius: var(--radius-sm);
        background-color: var(--color-bg-elevated);
    }
    
    .member-item.clickable {
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .member-item.clickable:hover {
        background-color: var(--surface-glass);
    }

    .member-main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .avatar-wrapper {
        position: relative;
    }

    .online-dot {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-online);
        border: 2px solid var(--color-bg-elevated);
    }

    .member-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .name {
        font-weight: 600;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--color-text-muted);
        flex-wrap: wrap;
    }

    .username {
        opacity: 0.8;
    }

    .chip {
        display: inline-flex;
       align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        font-size: 0.75rem;
        text-transform: lowercase;
    }

    .chip.role {
        background: rgba(125, 105, 255, 0.15);
        color: var(--color-text);
    }

    .chip.status {
        background: rgba(255, 255, 255, 0.08);
    }

    .chip.status.online {
        background: rgba(76, 217, 100, 0.2);
        color: var(--color-online);
    }

    .member-actions :global(*) {
        display: inline-flex;
    }
</style>
