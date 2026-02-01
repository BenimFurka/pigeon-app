<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { formatLastSeen } from '$lib/datetime';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Button from '$lib/components/shared/Button.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { useCurrentProfile } from '$lib/queries/profile';
    import { presence } from '$lib/stores/presence';
    import type { UserPublic } from '$lib/types/models';

    export let user: UserPublic;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        message: void;
    }>();

    const currentUserQuery = useCurrentProfile();
    $: currentUser = $currentUserQuery?.data || null;
    
    const presenceStore = presence;
    $: presenceState = $presenceStore ?? {};
    
    let isOnline = false;
    let lastSeenText: string | null = null;
    
    function getPresenceRecord(userId: number) {
        return presenceState[userId];
    }
    
    $: if (user?.id) {
        const record = getPresenceRecord(user.id);
        isOnline = Boolean(record?.online);
        const lastSeenAt = record?.lastSeenAt || user.last_seen_at;
        lastSeenText = isOnline ? 'В сети' : (lastSeenAt ? formatLastSeen(lastSeenAt) : null);
    } else {
        isOnline = false;
        lastSeenText = null;
    }
    
    function handleClose() {
        dispatch('close');
    }
    
    function handleMessageClick() {
        dispatch('message');
    }
    
    $: isCurrentUser = currentUser?.id === user?.id;
</script>

<Modal
    open={isOpen}
    title="Профиль пользователя"
    showBack={false}
    maxWidth="500px"
    zIndex={149201}
    on:close={handleClose}
>
    <div class="content">
        <div class="user-avatar-container">
            <Avatar avatarUrl={user.avatar_url} size="xlarge" />
            {#if isOnline}
                <span class="online-dot" title="В сети" />
            {/if}
        </div>
        
        <div class="user-info-section">
            <h3 class="user-name">{user.name || user.username}</h3>
            <div class="username">@{user.username}</div>
            
            {#if lastSeenText}
                <div class="status-text" class:online={isOnline}>
                    {lastSeenText}
                </div>
            {/if}
            
            {#if user.bio}
                <div class="bio">
                    <h4>О себе</h4>
                    <p>{user.bio}</p>
                </div>
            {/if}
        </div>
    </div>
    
    <div slot="footer">
        {#if !isCurrentUser}
            <div class="footer-field"> 
                <Button variant="outline" fullWidth on:click={handleMessageClick}>
                    Написать
                </Button>
            </div>
        {/if}
    </div>
</Modal>

<style>
    .footer-field {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .content {
        display: flex;
        flex-direction: column;
    }
    
    .user-avatar-container {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 20px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .online-dot {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-online);
        border: 2px solid var(--color-bg-elevated);
    }
    
    .user-info-section {
        text-align: center;
    }
    
    .user-name {
        margin: 0 0 8px;
        font-size: 1.5rem;
        font-weight: 600;
    }
    
    .username {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        margin-bottom: 16px;
    }
    
    .status-text {
        color: var(--color-accent);
        margin-bottom: 24px;
        font-size: 0.95rem;
    }
    
    .status-text.online {
        color: var(--color-online);
    }
    
    .bio {
        text-align: left;
        margin-top: 24px;
    }
    
    h4 {
        margin: 0 0 8px;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text);
    }
    
    p {
        margin: 0;
        color: var(--color-text);
        line-height: 1.5;
    }
</style>
