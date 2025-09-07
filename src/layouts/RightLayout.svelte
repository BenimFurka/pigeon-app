<script lang="ts">
    import Bar from "../components/ui/Bar.svelte";
</script>

<div id="right-layout" class="right-layout">
    <Bar noCenter={true}>
        <div class="chat-bar-text">
            <span id="chat-bar-name">Название чата</span>
            <span id="chat-bar-status"></span>
        </div>
    </Bar>
</div>

<style>
    .chat-bar-text {
        display: flex;
        flex-direction: column;
        max-width: auto; 
        overflow: hidden; 
        line-height: 1.5;
    }

    .chat-bar-text span:not(:first-child) {
        color: var(--primary-color);
        font-size: 0.8em;
    }

    .right-layout {
        display: flex;
        flex-direction: column;
        flex: 1;

        height: 100%;
        overflow: hidden; 
    }
</style>