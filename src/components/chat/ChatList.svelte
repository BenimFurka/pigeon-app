<script lang="ts">
    import { ChatItem } from "../../types/components";

    // TODO: доделать короче, я это запомню
</script>

<div class="list">
    <!-- тут будут сообщения -->
</div>

<style>
    .list {
        display: flex;
        flex: 1 1 0%;
        min-height: 0; 
        overflow-y: auto;
        overflow-x: hidden;
        margin: 10px;
        color: var(--text-color);
        padding: 5px;
    }
</style>