<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { type Chat, type ChatPreview, type ChatMember, ChatType } from '$lib/types/models';
    import { presence, type PresenceRecord } from '$lib/stores/presence';
    import { formatLastSeen } from '$lib/datetime';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import Modal from '$lib/components/overlays/Modal.svelte';
    import { useCurrentProfile } from '$lib/queries/profile';
    import MemberListItem from '$lib/components/shared/MemberListItem.svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { chatKeys } from '$lib/queries/chats';
    import { _, format } from 'svelte-i18n';
    import { Settings } from 'lucide-svelte';

    // Props
    export let chat: Chat;
    export let chatPreview: ChatPreview;
    export let isOpen = false;

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        close: void;
        edit: { chat: any };
        back: void;
        manageMembers: void;
        userClick: { user: any };
    }>();

    // Queries and stores
    const presenceStore = presence;
    const currentUserQuery = useCurrentProfile();
    const queryClient = useQueryClient();

    // Mutations
    const leaveChatMutation = createMutation({
        mutationFn: async () => {
            const { makeRequest } = await import('$lib/api');
            const res = await makeRequest(`/chats/${chat.id}/members/${currentUser?.id}`, null, true, 'DELETE');
            if ((res as any).error) throw new Error((res as any).error.message || $_('chat_info.leave_chat_error'));
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.detail(chat.id) });
            queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
            dispatch('close');
        },
        onError: (e: any) => {
            console.error('Failed to leave chat:', e);
        }
    });

    // State
    let isOnline = false;
    let lastSeenText: string | null = null;
    let members: ChatMember[] = [];
    let onlineCount = 0;
    let memberCountDisplay = 0;
    let myMembership: ChatMember | undefined;
    let presenceState: Record<number, PresenceRecord> = {}; 

    // Reactive statements
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
    $: showMembersSectionForChannel = chat?.chat_type === ChatType.CHANNEL && canManageMembers;
    $: onlineCount = members.reduce((count, member) => {
        return count + (isMemberOnline(member.user_id) ? 1 : 0);
    }, 0);
    $: memberCountDisplay = members.length || chat?.member_count || 0;
    $: modalTitle = chat?.chat_type === ChatType.DM 
        ? $_('chat_info.user_info')
        : chat?.chat_type === ChatType.GROUP 
        ? $_('chat_info.group_info')
        : $_('chat_info.channel_info');
    
    $: if (chat?.chat_type === ChatType.DM && chatPreview.other_user?.id) {
        const record = getPresenceRecord(chatPreview.other_user.id);
        isOnline = Boolean(record?.online);
        const lastSeenAt = record?.lastSeenAt || chatPreview.other_user.last_seen_at;
        lastSeenText = isOnline ? $_('chat_info.online') : (lastSeenAt ? formatLastSeen(lastSeenAt, $format) : null);
    } else {
        isOnline = false;
        lastSeenText = null;
    }

    // Event handlers
    function handleClose() {
        dispatch('close');
    }
    
    function handleEdit() {
        dispatch('edit', { chat });
    }
    
    function handleManageMembers() {
        dispatch('manageMembers');
    }
    
    function handleUserClick(event: CustomEvent) {
        dispatch('userClick', event.detail);
    }
    
    function handleLeaveChat() {
        if (confirm($_('chat_info.leave_chat_confirm'))) {
            $leaveChatMutation.mutate();
        }
    }

    // Utility functions
    function getPresenceRecord(userId: number) {
        return presenceState[userId];
    }

    function getMemberStatus(userId: number) {
        const record = getPresenceRecord(userId);
        if (record?.online) {
            return $_('chat_info.online');
        }
        return formatLastSeen(record?.lastSeenAt, $format) ?? $_('chat_info.offline');
    }

    function isMemberOnline(userId: number) {
        return Boolean(getPresenceRecord(userId)?.online);
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
            <Avatar avatarUrl={avatarUrl} size={120} />
            {#if chat.chat_type === ChatType.DM && isOnline}
                <span class="online-dot" title={$_('chat_info.online')} />
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
                        <h4>{$_('chat_info.about')}</h4>
                        <p>{chatPreview.other_user.bio}</p>
                    </div>
                {/if}
            
            {:else if chat.chat_type === ChatType.GROUP}
                <div class="member-count">
                    {memberCountDisplay} {$_('chat_info.members')} • {onlineCount} {$_('chat_info.online')}
                </div>
                
                {#if chat.description}
                    <div class="description">
                        <h4>{$_('chat_info.description')}</h4>
                        <p>{chat.description}</p>
                    </div>
                {/if}
            
            <div class="chat-info-group">
                <div class="group-header">
                    <span>{$_('chat_info.members_title')}</span>
                    {#if canManageMembers}
                        <button class="btn text small" on:click={handleManageMembers}>
                            {$_('chat_info.add_member')}
                        </button>
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
            
            {#if myMembership && chat.owner_id !== currentUser?.id}
                <div class="chat-info-group">
                    <div class="group-header">
                        <Settings size={18} />
                        <span>{$_('chat_info.actions')}</span>
                    </div>
                    <div class="leave-chat-section">
                        <button 
                            class="btn text small"
                            on:click={handleLeaveChat}
                            disabled={$leaveChatMutation.isPending}
                            style="color: var(--color-danger);"
                        >
                            {$_('chat_info.leave_group')}
                        </button>
                    </div>
                </div>
            {/if}
            
        {:else if chat.chat_type === ChatType.CHANNEL}
            <div class="subscriber-count">
                {chat.member_count || 0} {$_('chat_info.subscribers')}
            </div>
            
            {#if chat.description}
                <div class="description">
                    <h4>{$_('chat_info.description')}</h4>
                    <p>{chat.description}</p>
                </div>
            {/if}

            {#if showMembersSectionForChannel}
                <div class="chat-info-group">
                    <div class="group-header">
                        <span>{$_('chat_info.members_title')}</span>
                        <button class="btn text small" on:click={handleManageMembers}>
                            {$_('chat_info.manage_members')}
                        </button>
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
            {/if}

            {#if myMembership && chat.owner_id !== currentUser?.id}
                <div class="chat-info-group">
                    <div class="group-header">
                        <Settings size={18} />
                        <span>{$_('chat_info.actions')}</span>
                    </div>
                    <div class="leave-chat-section">
                        <button 
                            class="btn text small"
                            on:click={handleLeaveChat}
                            disabled={$leaveChatMutation.isPending}
                            style="color: var(--color-danger);"
                        >
                            {$_('chat_info.leave_channel')}
                        </button>
                    </div>
                </div>
            {/if}
        {/if}
    </div>
</Modal>

<style>
    .content {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .chat-info-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        margin-top: 16px;
        border-radius: var(--radius-sm);
        background: var(--surface-glass);
    }

    .group-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 4px;
        justify-content: space-between;
    }
    
    .chat-avatar-container {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto;
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
    .members-list,
    .leave-chat-section {
        text-align: left;
        margin-top: 24px;
    }
    
    .leave-chat-section {
        text-align: center;
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
        gap: 0;
        border-radius: 12px;
        background-color: var(--color-bg-elevated);
        padding: 0;
        overflow: hidden;
    }
</style>
