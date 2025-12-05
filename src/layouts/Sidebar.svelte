<script lang="ts">
    import { Settings, Plus } from "lucide-svelte";
    import { currentUser } from "../stores/auth";
    import { useCurrentProfile } from "../queries/profile";
    import Avatar from "../components/chat/Avatar.svelte";

    export let inSettings: boolean = false;
    export let onToggleSettings: () => void = () => {};
    export let onOpenCreateChat: () => void = () => {};

    const profileQuery = useCurrentProfile();
    $: currentProfile = $profileQuery?.data || null;

    function handleToggle() {
        onToggleSettings();
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
            class="sidebar-button {inSettings ? 'active' : ''}"
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
        background-color: hsl(var(--hue), 12%, 7%);
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
        color: rgba(255, 255, 255, 0.4);
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
        background: var(--glass);
        color: rgba(255, 255, 255, 0.7);
    }
    
    .sidebar-button.active {
        background: var(--primary-color);
        color: var(--text-color);
    }
</style>
