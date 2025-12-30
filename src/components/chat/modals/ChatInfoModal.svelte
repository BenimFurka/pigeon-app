<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { MessageSquare } from 'lucide-svelte';
    import { type Chat, type ChatPreview, type ChatMember, ChatType } from '../../../types/models';
    import { presence, type PresenceRecord } from '../../../stores/presence';
    import { formatLastSeen } from '../../../lib/datetime';
    import Avatar from '../Avatar.svelte';
    import Button from '../../ui/Button.svelte';
    import Modal from '../../ui/Modal.svelte';
    import { useCurrentProfile } from '../../../queries/profile';
    import MemberListItem from '../MemberListItem.svelte';

    export let chat: Chat;
    export let chatPreview: ChatPreview;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        edit: { chat: any };
        back: void;
        manageMembers: void;
        message: void;
        userClick: { user: any };
    }>();

    const presenceStore = presence;
    
    let isOnline = false;
    let lastSeenText: string | null = null;
    let members: ChatMember[] = [];
    let onlineCount = 0;
    let memberCountDisplay = 0;
    let myMembership: ChatMember | undefined;
    let presenceState: Record<number, PresenceRecord> = {};
    
    const currentUserQuery = useCurrentProfile();
    $: currentUser = $currentUserQuery?.data || null; 

    $: avatarUrl = chatPreview?.chat_type === ChatType.DM 
        ? chatPreview.other_user?.avatar_url 
        : chatPreview?.avatar_url;
        
    $: displayName = chatPreview?.chat_type === ChatType.DM
        ? chatPreview.other_user?.name
        : chatPreview?.name;

    $: presenceState = $presenceStore ?? {};

    $: members = chat?.members ?? [];

    $: myMembership = currentUser ? members.find((member) => member.user_id === currentUser.id) : undefined;

    $: canEditChat = Boolean(myMembership?.can_manage_chat || chat?.owner_id === currentUser?.id);
    $: canManageMembers = Boolean(myMembership?.can_manage_members || chat?.owner_id === currentUser?.id);
    
    function getPresenceRecord(userId: number) {
        return presenceState[userId];
    }

    function getMemberStatus(userId: number) {
        const record = getPresenceRecord(userId);
        if (record?.online) {
            return 'в сети';
        }
        return formatLastSeen(record?.lastSeenAt) ?? 'не в сети';
    }

    function isMemberOnline(userId: number) {
        return Boolean(getPresenceRecord(userId)?.online);
    }

    $: onlineCount = members.reduce((count, member) => {
        return count + (isMemberOnline(member.user_id) ? 1 : 0);
    }, 0);

    $: memberCountDisplay = members.length || chat?.member_count || 0;

    $: if (chat?.chat_type === ChatType.DM && chatPreview.other_user?.id) {
        const record = getPresenceRecord(chatPreview.other_user.id);
        isOnline = Boolean(record?.online);
        const lastSeenAt = record?.lastSeenAt || chatPreview.other_user.last_seen_at;
        lastSeenText = isOnline ? 'В сети' : (lastSeenAt ? formatLastSeen(lastSeenAt) : null);
    } else {
        isOnline = false;
        lastSeenText = null;
    }
    
    $: modalTitle = chat?.chat_type === ChatType.DM 
        ? 'Информация о пользователе'
        : chat?.chat_type === ChatType.GROUP 
        ? 'Информация о группе'
        : 'Информация о канале';
    
    function handleClose() {
        dispatch('close');
    }
    
    function handleEdit() {
        dispatch('edit', { chat });
    }
    
    function handleAddMember() {
        dispatch('manageMembers');
    }

    function handleMessageClick() {
        dispatch('message');
    }
    
    function handleUserClick(event: CustomEvent) {
        dispatch('userClick', event.detail);
    }
</script>

<Modal
    open={isOpen}
    title={modalTitle}
    showBack={false}
    showEdit={canEditChat}
    maxWidth="500px"
    on:close={handleClose}
    on:edit={handleEdit}
>
    <div class="content">
        <div class="chat-avatar-container">
            <Avatar avatarUrl={avatarUrl} size="xlarge" />
            {#if chat.chat_type === ChatType.DM && isOnline}
                <span class="online-dot" title="В сети" />
            {/if}
        </div>
        
        <div class="chat-info-section">
            <h3 class="chat-name">{displayName}</h3>
            {#if chat.chat_type === ChatType.DM}
                {#if lastSeenText}
                    <div class="status-text" class:online={isOnline}>
                        {lastSeenText}
                    </div>
                {/if}
                
                {#if chatPreview.other_user?.bio}
                    <div class="bio">
                        <h4>О себе</h4>
                        <p>{chatPreview.other_user.bio}</p>
                    </div>
                {/if}
                
            {:else if chat.chat_type === ChatType.GROUP}
                <div class="member-count">
                    {memberCountDisplay} участников • {onlineCount} онлайн
                </div>
                
                {#if chat.description}
                    <div class="description">
                        <h4>Описание</h4>
                        <p>{chat.description}</p>
                    </div>
                {/if}
                
                <div class="members-section">
                    <div class="section-header">
                        <h4>Участники</h4>
                        {#if canManageMembers}
                            <Button variant="text" size="small" on:click={handleAddMember}>
                                Добавить
                            </Button>
                        {/if}
                    </div>
                    
                    <div class="members-list">
                        {#each members as member (member.user_id)}
                            <MemberListItem
                                userId={member.user_id}
                                role={member.role}
                                isOnline={isMemberOnline(member.user_id)}
                                statusText={getMemberStatus(member.user_id)}
                                on:userClick={handleUserClick}
                            />
                        {/each}
                    </div>
                </div>
                
            {:else if chat.chat_type === ChatType.CHANNEL}
                <div class="subscriber-count">
                    {chat.member_count || 0} подписчиков
                </div>
                
                {#if chat.description}
                    <div class="description">
                        <h4>Описание</h4>
                        <p>{chat.description}</p>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</Modal>

<style>
    .content {
        display: flex;
        flex-direction: column;
    }
    
    .chat-avatar-container {
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
    
    .chat-info-section {
        text-align: center;
    }
    
    .chat-name {
        margin: 0 0 8px;
        font-size: 1.5rem;
        font-weight: 600;
    }
    
    .status-text {
        color: var(--color-accent);
        margin-bottom: 24px;
        font-size: 0.95rem;
    }
    
    .status-text.online {
        color: var(--color-online);
    }
    
    .bio,
    .description,
    .members-section {
        text-align: left;
        margin-top: 24px;
    }
    
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
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
    
    .member-count,
    .subscriber-count {
        color: var(--color-text-muted);
        margin-bottom: 16px;
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

</style>
