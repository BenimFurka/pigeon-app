<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { MessageReaction } from '../../types/models';

  export let reactions: MessageReaction[] = [];
  export let currentUserId: number | null = null;
  export let isOwnMessage: boolean = false;
  export let messageId: number | null = null;

  const dispatch = createEventDispatcher();

  // export let onAdd: (emoji: string) => void;
  // export let onRemove: (emoji: string) => void;

  $: reactionsByEmoji = (reactions || []).filter(r => r && r.emoji).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [] as number[];
    acc[r.emoji].push(r.user_id);
    return acc;
  }, {} as Record<string, number[]>);

  function hasUser(emoji: string): boolean {
    if (!currentUserId) return false;
    return (reactionsByEmoji[emoji] || []).includes(currentUserId);
  }

  function handleReactionClick(emoji: string) {
    if (!messageId) return;
    
    if (hasUser(emoji)) {
      dispatch('removeReaction', { emoji, messageId });
    } else {
      dispatch('addReaction', { emoji, messageId });
    }
  }
</script>

{#if Object.keys(reactionsByEmoji).length > 0}
  <div class="reactions" class:own-message={isOwnMessage}>
    {#each Object.entries(reactionsByEmoji) as [emoji, userIds]}
      <button 
        class="reaction-item" 
        class:has-user={hasUser(emoji)} 
        class:own-reaction={isOwnMessage && hasUser(emoji)}
        on:click={() => handleReactionClick(emoji)}
        title={hasUser(emoji) ? "Удалить реакцию" : "Добавить реакцию"}
      >
        <span class="emoji">{emoji}</span>
        <span class="count">{userIds.length}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  
  .reaction-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    font-size: 14px;
    transition: all 0.2s ease;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
  }
  
  .reaction-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
  
  .reaction-item.has-user {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  
  .reaction-item.has-user:hover {
    background: var(--color-accent);
    opacity: 0.9;
  }
  
  .emoji {
    font-size: 16px;
    line-height: 1;
  }
  
  .count {
    font-size: 12px;
    font-weight: 500;
    opacity: 0.8;
  }
  
  .reaction-item.has-user .count {
    opacity: 1;
  }
  
  .own-message .reaction-item.own-reaction {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.9);
    color: #333;
  }
  
  .own-message .reaction-item.own-reaction:hover {
    background: rgba(255, 255, 255, 0.95);
  }
  
  .own-message .reaction-item.own-reaction .emoji {
    filter: none;
  }
  
  .own-message .reaction-item.own-reaction .count {
    opacity: 1;
    color: #333;
  }
</style>
