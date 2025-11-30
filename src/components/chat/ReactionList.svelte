<!-- TODO: finish and use -->
<script lang="ts">
  import type { MessageReaction } from '../../types/models';

  export let reactions: MessageReaction[] = [];
  export let currentUserId: number | null = null;

  // export let onAdd: (emoji: string) => void;
  // export let onRemove: (emoji: string) => void;

  $: reactionsByEmoji = (reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [] as number[];
    acc[r.emoji].push(r.user_id);
    return acc;
  }, {} as Record<string, number[]>);

  function hasUser(emoji: string): boolean {
    if (!currentUserId) return false;
    return (reactionsByEmoji[emoji] || []).includes(currentUserId);
  }
</script>

{#if Object.keys(reactionsByEmoji).length > 0}
  <div class="reactions"></div>
{/if}

<style>
  .reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
</style>
