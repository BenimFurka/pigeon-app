<script lang="ts">
    import Input from '../components/ui/Input.svelte';
    import Bar from '../components/ui/Bar.svelte';
    import ChatList from '../components/chat/ChatList.svelte';
    import { createEventDispatcher } from 'svelte';
    import type { Chat } from '../types/models';
    import { Settings } from 'lucide-svelte';

    const dispatch = createEventDispatcher<{ select: { chat: Chat } }>();
    
    export let onToggleSettings: () => void = () => {};
    export let inSettings: boolean = false;
    export let isMobile: boolean = false;
    export let isVisible: boolean = true;

    let searchQuery = '';
    let selectedChatId: number | null = null;
    
    $: layoutVisibleClass = isMobile ? (isVisible ? 'mobile-visible' : 'mobile-hidden') : '';

    function handleChatSelect(event: CustomEvent<{ chat: Chat }>) {
        const { chat } = event.detail;
        selectedChatId = chat.id;
        dispatch('select', { chat });
    }

    function handleToggleSettings() {
        onToggleSettings();
    }
</script>

<div class={`left-layout ${layoutVisibleClass}`} id="left-layout">
   <Bar>
        <div class="search-header">
            {#if isMobile}
                <button
                    class={`settings-button ${inSettings ? 'active' : ''}`}
                    on:click={handleToggleSettings}
                    title="Настройки"
                    aria-label="Настройки"
                >
                    <Settings size={18} />
                </button>
            {/if}
            <Input 
                placeholder="Поиск..."
                style="width: 100%; margin: 10px; padding: 10px;"
                bind:value={searchQuery} />
        </div>
   </Bar>
    <ChatList bind:selectedChatId on:select={handleChatSelect} />
</div>

<style>
    .left-layout {
        display: flex;
        flex-direction: column;

        min-height: 0;
        height: 100%;
        width: 100%;
        max-width: 100%;
        
        z-index: 0;
        overflow: hidden;

        background-image: 
            linear-gradient(var(--glass), var(--glass)),
            linear-gradient(var(--secondary-color), var(--secondary-color));
                
        transition: var(--transition);
    }

    .left-layout.mobile-hidden {
        transform: translateX(-100%);
        pointer-events: none;
    }

    .left-layout.mobile-visible {
        transform: translateX(0);
    }

    .search-header {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
    }

    .settings-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-right: 10px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: var(--transition);
    }

    .settings-button:hover {
        background: var(--glass);
        color: rgba(255, 255, 255, 0.9);
    }

    .settings-button.active {
        background: var(--primary-color);
        color: var(--text-color);
    }

    @media (max-width: 900px) {
        .left-layout {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            max-width: 100%;
            z-index: 2;
        }
    }

    @media (min-width: 901px) {
        .left-layout {
            max-width: 320px;
            margin-left: 42px;
        }
    }
</style>