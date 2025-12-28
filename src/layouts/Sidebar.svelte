<script lang="ts">
    import { Settings, Plus } from "lucide-svelte";

    export let isSettingsOpen: boolean = false;
    export let onOpenSettings: () => void = () => {};
    export let onOpenCreateChat: () => void = () => {};

    function handleToggle() {
        onOpenSettings();
    }
</script>    

<div class="sidebar">
    <div class="sidebar-actions">
        <button
            class="sidebar-button"
            title="Создать чат"
            aria-label="Создать чат"
            on:click={onOpenCreateChat}
        >
            <Plus size={20} />
        </button>
        <button
            class="sidebar-button {isSettingsOpen ? 'active' : ''}"
            on:click={handleToggle}
            title="Настройки"
            aria-label="Настройки"
        >
            <Settings size={20} />
        </button>
    </div>
</div>

<style>
    .sidebar {
        padding: 10px 0;
        position: absolute;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        justify-content: space-between;
        background-color: var(--color-bg-elevated);
        width: 42px;
        min-width: 0;
        height: 100%;
        z-index: 5;
        gap: 10px;
    }
    
    .sidebar-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-bottom: 12px;
    }
    
    .sidebar-button {
        background: transparent;
        border: none;
        color: var(--color-text);
        cursor: pointer;
        padding: 6px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
        width: 36px;
        height: 36px;
    }
    
    .sidebar-button:hover {
        background: var(--surface-glass);
        filter: var(--hover-filter)
    }
    
    .sidebar-button.active {
        background: var(--color-accent);
        color: var(--color-text);
    }
</style>
