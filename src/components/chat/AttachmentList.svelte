<script lang="ts">
    import type { MessageAttachment } from '../../types/models';
    import AttachmentItem from './AttachmentItem.svelte';

    export let attachments: MessageAttachment[];
</script>

{#if attachments && attachments.length > 0}
    <div class="attachments-list">
        {#each attachments as attachment (attachment.id)}
            <AttachmentItem {attachment} />
        {/each}
    </div>
{/if}

<style>
    .attachments-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 8px;
    }
</style>


