<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { get } from 'svelte/store';
    import { Edit, MessageSquare, Trash2 } from 'lucide-svelte';
    import { type Chat, type ChatPreview, type ChatMember, ChatType } from '../../../types/models';
    import { presence } from '../../../stores/presence';
    import { formatLastSeen } from '../../../lib/datetime';
    import Avatar from '../Avatar.svelte';
    import Button from '../../ui/Button.svelte';
    import Modal from '../../ui/Modal.svelte';
    import { useCurrentProfile } from '../../../queries/profile';

    export let chat: Chat; // TODO: maybe doesn't work?
    export let chatPreview: ChatPreview;
    export let isOpen = false;
    
    const dispatch = createEventDispatcher<{
        close: void;
        edit: { chat: any };
        back: void;
    }>();

    const presenceStore = { subscribe: presence.subscribe };
    
    let isOnline = false;
    let lastSeenText: string | null = null;
    let isAdmin = false;
    let isCreator = false;
    let members: ChatMember[] = [];
    let onlineCount = 0;
    
    
    // TODO: members
    const currentUserQuery = useCurrentProfile();
    $: currentUser = $currentUserQuery?.data || null;
    $: members = [];
    
    $: if (chat) {
        isAdmin = false; // TODO: currentUser ? chat.members[currentUser?.id].role == "admin" || false : false;
        isCreator = chat.owner_id === currentUser?.id;
        
        if (members) {
            onlineCount = members.filter(m => {
                const presenceData = get(presenceStore)[m.user_id];
                return presenceData?.online;
            }).length;
        }
        
        if (chat.chat_type === ChatType.DM && chatPreview.other_user) {
            const counterpartId = chatPreview.other_user.id;
            if (counterpartId) {
                const presenceData = get(presenceStore)[counterpartId];
                isOnline = Boolean(presenceData?.online);
                lastSeenText = isOnline ? 'В сети' : `Был(а) ${formatLastSeen(presenceData?.lastSeenAt || presenceData?.updatedAt || chatPreview.other_user.last_seen_at)}`;
            }
        }
    }
    
    $: modalTitle = chat?.chat_type === ChatType.DM 
        ? 'Информация о пользователе'
        : chat?.chat_type === ChatType.GROUP 
        ? 'Информация о группе'
        : 'Информация о канале';
    
    function handleClose() {
        dispatch('close');
    }
    
    function handleBack() {
        dispatch('back');
    }
    
    function handleEdit() {
        dispatch('edit', { chat });
    }
    
    function handleAddMember() {
        // TODO: Implement add member functionality
        console.log('Add member clicked');
    }
</script>

<Modal
    open={isOpen}
    title={modalTitle}
    showBack={true}
    maxWidth="500px"
    on:close={handleClose}
    on:back={handleBack}
>
    <div class="content">
        <div class="chat-avatar-container">
            <Avatar avatarUrl={chat.avatar_url} size="xlarge" />
            {#if chat.chat_type === ChatType.DM && isOnline}
                <span class="online-dot" title="В сети" />
            {/if}
        </div>
        
        <div class="chat-info-section">
            <h3 class="chat-name">{chat.name || 'Безымянный чат'}</h3>
            
            <!-- TODO: custom modal -->
            {#if chat.chat_type === ChatType.DM}
                {#if lastSeenText}
                    <div class="status-text" class:online={isOnline}>
                        {lastSeenText}
                    </div>
                {/if}
                
                {#if chatPreview.other_user}
                    <div class="bio">
                        <h4>О себе</h4>
                        <p>{chatPreview.other_user.bio}</p>
                    </div>
                {/if}
                
            {:else if chat.chat_type === ChatType.GROUP}
                <div class="member-count">
                    {members.length} участников • {onlineCount} онлайн
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
                        {#if isAdmin || isCreator}
                            <Button variant="text" size="small" on:click={handleAddMember}>
                                Добавить
                            </Button>
                        {/if}
                    </div>
                    
                    <div class="members-list">
                        <!-- TODO: minecraft -->
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
    
    <div slot="footer">
        {#if isAdmin || isCreator}
            <div class="footer-field"> 
                <Edit size={16} class="icon" />
                
                <Button on:click={handleEdit} variant="outline" fullWidth>
                    Редактировать
                </Button>
            </div>
        {/if}
        
        {#if chat.chat_type === ChatType.DM}
            <div class="footer-field"> 
                <MessageSquare size={16} class="icon" />
                
                <Button variant="outline" fullWidth>
                    Написать сообщение
                </Button>
            </div>
        {/if}
        
        {#if isCreator && chat.chat_type !== ChatType.DM}
            <div class="footer-field"> 
                <Button variant="danger" fullWidth>
                    <Trash2 size={16} class="icon" />
                    Удалить {chat.chat_type === ChatType.GROUP ? 'группу' : 'канал'}
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
    
    .chat-avatar-container {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 20px;
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
    
    .members-list {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        overflow: hidden;
    }
    
    .member-count,
    .subscriber-count {
        color: var(--color-text-muted);
        margin-bottom: 16px;
        font-size: 0.95rem;
    }
</style>
