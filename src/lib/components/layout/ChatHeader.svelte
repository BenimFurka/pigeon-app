<script lang="ts">
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { ChatType, type ChatPreview, type Chat, type ChatMember } from '$lib/types/models';
    import { subscribeToPresence } from '$lib/presence';
    import Avatar from '$lib/components/shared/Avatar.svelte';
    import { ArrowLeft, MoreVertical } from 'lucide-svelte';
    import { formatLastSeen } from '$lib/datetime';
    import { _, format } from 'svelte-i18n';
    import { typing } from '$lib/stores/typing';
    import { useCurrentProfile } from '$lib/queries/profile';
    import PollCreator from '$lib/components/forms/modals/PollCreator.svelte';
    import { onMount } from 'svelte';
    
    // Profile query
    const profileQuery = useCurrentProfile();
    
    // Props
    export let chatContext: {
        selectedChat: ChatPreview | null;
        chat: Chat | null;
        isCreator: boolean;
        myMembership: ChatMember | undefined;
        isMobile: boolean;
        onUserClick: (event: CustomEvent) => void;
    };

    // Event dispatcher
    const dispatch = createEventDispatcher<{
        back: void;
        search: void;
        menu: void;
        userClick: { user: any };
        openChatInfo: void;
        createPoll: { poll: any };
    }>();

    // State
    let isOnline = false;
    let chatStatus: string | null = null;
    let unsubscribePresence: (() => void) | null = null;
    let typingUsers: number[] = [];
    let unsubscribeTyping: (() => void) | null = null;
    let showDropdown = false;
    let showPollCreator = false;

    // Computed values
    $: chatPreview = chatContext.selectedChat;
    $: isMobile = chatContext.isMobile;
    $: avatarUrl = chatPreview?.chat_type === ChatType.DM 
        ? chatPreview.other_user?.avatar_url 
        : chatPreview?.avatar_url;
    $: displayName = chatPreview?.chat_type === ChatType.DM
        ? chatPreview.other_user?.name
        : chatPreview?.name;
    $: chatId = chatPreview?.id && chatPreview.id > 0 ? Number(chatPreview.id) : null;
    $: typingStatus = getTypingStatus(typingUsers, chatPreview?.chat_type);

    // Reactive statements
    $: {
        isOnline = false;
        chatStatus = null;
        
        if (unsubscribePresence) {
            unsubscribePresence();
            unsubscribePresence = null;
        }
        
        if (unsubscribeTyping) {
            unsubscribeTyping();
            unsubscribeTyping = null;
        }
        
        if (chatPreview?.chat_type === ChatType.DM && chatPreview.other_user?.id) {
            unsubscribePresence = subscribeToPresence(
                chatPreview.other_user.id,
                (online, lastSeenAt) => {
                    isOnline = online;
                    if (online) {
                        chatStatus = $_('presence.online');
                    } else if (lastSeenAt) {
                        chatStatus = formatLastSeen(lastSeenAt, $format) || $_('presence.offline');
                    } else {
                        chatStatus = $_('presence.offline');
                    }
                }
            );
        } else if (chatPreview) {
            chatStatus = chatPreview.chat_type === ChatType.GROUP 
                ? `${chatPreview.member_count} ${$_('chat_header.members')}` 
                : `${chatPreview.member_count} ${$_('chat_header.subscribers')}`;
        }
        
        if (chatId) {
            unsubscribeTyping = typing.subscribe(($typing) => {
                const chatState = $typing[chatId];
                if (chatState) {
                    const now = Date.now();
                    const allTypingUsers = Object.entries(chatState)
                        .filter(([_, timestamp]) => now - timestamp < 15000)
                        .map(([userId, _]) => Number(userId));
                    
                    typingUsers = allTypingUsers.filter(userId => userId !== $profileQuery.data?.id);
                } else {
                    typingUsers = [];
                }
            });
        }
    }

    // Lifecycle hooks
    onMount(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.dropdown-container')) {
                showDropdown = false;
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });

    onDestroy(() => {
        if (unsubscribePresence) {
            unsubscribePresence();
        }
        if (unsubscribeTyping) {
            unsubscribeTyping();
        }
    });

    // Utility functions
    function getTypingStatus(users: number[], chatType?: string): string | null {
        if (users.length === 0) return null;
        
        if (chatType === ChatType.DM) {
            return users.length === 1 ? $_('typing.is_typing') : $_('typing.are_typing');
        } else {
            if (users.length === 1) {
                return $_('typing.one_user_typing');
            } else if (users.length === 2) {
                return $_('typing.two_users_typing');
            } else {
                return $format('typing.many_users_typing', { values: { count: users.length } });
            }
        }
    }

    // Event handlers
    function handleOpenChatInfo() {
        dispatch('openChatInfo');
    }

    function toggleDropdown() {
        showDropdown = !showDropdown;
    }

    function openPollCreator() {
        showDropdown = false;
        showPollCreator = true;
    }

    function handleCreatePoll(poll: any) {
        dispatch('createPoll', { poll });
    }

    function handleClosePollCreator() {
        showPollCreator = false;
    }
</script>

<div class="chat-header">
    <div class="header-left">
        {#if isMobile}
            <button class="back-button" on:click={() => dispatch('back')} aria-label={$_('chat_header.back_to_chat_list')}>
                <ArrowLeft size={18} />
            </button>
        {/if}
        {#if chatPreview}
        <div class="chat-info" role="button" tabindex="0" on:click={handleOpenChatInfo} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenChatInfo(); } }}>
            <div class="avatar-container">
                <Avatar {avatarUrl} />
                {#if chatPreview.chat_type === ChatType.DM && isOnline}
                    <span class="online-dot" title={$_('chat_info.online')} />
                {/if}
            </div> 
            <div class="chat-details">
                <span class="chat-name">{displayName}</span>
                {#if typingStatus}
                    <div class="chat-status typing">
                        <span class="typing-dots">{typingStatus}</span>
                    </div>
                {:else if chatStatus}
                    <div class="chat-status" class:online={isOnline}>
                        {chatStatus}
                    </div>
                {/if}
            </div>
        </div>
        {/if}
    </div>
    {#if chatPreview}
    <div class="header-right">
        <div class="dropdown-container" on:click={toggleDropdown} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(); } }} tabindex="0" role="button" aria-label={$_('chat_header.more_options')}>
            <button class="menu-button" aria-label={$_('chat_header.more_options')}>
                <MoreVertical size={20} />
            </button>
            
            {#if showDropdown}
            <div class="dropdown-menu" role="menu" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
                <button class="dropdown-item" role="menuitem" on:click={openPollCreator} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPollCreator(); } }}>
                    {$_('poll.create_poll')}
                </button>
            </div>
            {/if}
        </div>
    </div>
    {/if}
</div>

<PollCreator 
    isOpen={showPollCreator} 
    onClose={handleClosePollCreator}
    onCreate={handleCreatePoll}
/>

<style>
    .chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .header-right {
        display: flex;
        align-items: center;
    }
    
    .dropdown-container {
        position: relative;
        display: inline-block;
    }
    
    .menu-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text);
        cursor: pointer;
        transition: var(--transition);
        padding: 0;
    }

    .menu-button:hover {
        background: var(--surface-glass);
        color: var(--color-text);
    }
    
    .dropdown-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        min-width: 180px;
        z-index: 1000;
        overflow: hidden;
        margin-top: 4px;
    }
    
    .dropdown-item {
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: transparent;
        color: var(--color-text);
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .dropdown-item:hover {
        background: var(--surface-glass);
    }
    
    .dropdown-item:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: -2px;
    }
    
    .chat-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .avatar-container {
        position: relative;
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
    
    .chat-details {
        display: flex;
        flex-direction: column;
    }
    
    .chat-name {
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .chat-status {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    
    .chat-status.typing {
        color: var(--color-accent);
        font-style: italic;
        font-size: 0.75rem;
        opacity: 0.8;
        animation: fadeInOut 1.5s ease-in-out infinite;
    }
    
    .typing-dots::after {
        content: '';
        animation: dots 1.5s steps(4, end) infinite;
    }
    
    @keyframes fadeInOut {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
    
    @keyframes dots {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
    }
    
    .chat-status.online {
        color: var(--color-online);
    }
    
    .back-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text);
        cursor: pointer;
        transition: var(--transition);
    }

    .back-button:hover {
        background: var(--surface-glass);
        color: var(--color-text);
    }

    @media (min-width: 768px) {
        .back-button {
            display: none;
        }
    }
</style>
