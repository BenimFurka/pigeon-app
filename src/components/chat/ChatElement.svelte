<!-- Требует проверки хз -->

<script lang="ts">
    import { Profile, profiles } from "../../stores/profile";
    import { ChatType } from "../../types/enums";
    import { Message } from "../../types/message";
    import Avatar from "./Avatar.svelte";

    export let name: string = '';
    export let id: number;
    export let type: ChatType;

    export let lastMessage: Message;
    export let lastSenderId: number;
    export let userId: number | null;
    
    let isLoading: boolean = true;
    let lastSender: Profile | undefined = undefined;
    async function load() {
        try {
            isLoading = true;
            const newLastSender = await profiles.getProfile(lastSenderId);
            if (newLastSender != null) lastSender = newLastSender;
        } catch (err) {
            console.error("Failed to load user:", err);
        } finally {
            isLoading = false;
        }
    }

    $: {
        if (lastSenderId !== undefined) {
            load();
        }
    }
</script>

<div class="chat-element">
	<Avatar id={
        type === ChatType.DM && userId !== null ? userId : id
    }></Avatar>
    <div class="chat-info">
        <span class="chat-name">{name}</span>
        <span class="last-message">{lastSender !== undefined && lastSender !== null ? lastSender.name : ""}: {lastMessage.content}</span>
    </div>
</div>

<style>
    .chat-element {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        cursor: pointer;
        background: var(--glass);
        border-radius: 8px;
        opacity: 0.85;
        margin: 5px;
        transition: var(--transition), transform 0.3s;
        min-height: 60px;
        max-height: 60px;
        height: auto;
        box-sizing: border-box;
        width: calc(100% - 20px);
        max-width: 100%;
        overflow: hidden;
    }

    .chat-info {
        display: flex;
        flex-direction: column;
        white-space: nowrap;
        overflow: hidden;
    }
        
    .chat-name {
        color: var(--text-color);
        white-space: nowrap;
    }
    
    .last-message {
        color: var(--text-color);
        opacity: 0.7;
        font-size: 0.8em;
        white-space: nowrap;
        overflow: hidden;
        max-width: 100%;
        box-sizing: border-box;
    }

</style>