<script lang="ts">
    import Bar from "../components/ui/Bar.svelte";
    import ClickText from "../components/ui/ClickText.svelte";
    import { useCurrentProfile } from "../queries/profile";
    import { logout } from "../stores/auth";
    import { ArrowLeft } from 'lucide-svelte';
    import { theme, type Theme } from "../stores/theme";

    export let inSettings: boolean = false;
    export let isMobile: boolean = false;
    export let onClose: () => void = () => {};

    const profileQuery = useCurrentProfile();
    $: currentProfile = $profileQuery?.data || null;
    $: currentTheme = $theme as Theme;

    $: layoutStateClass = isMobile
        ? (inSettings ? 'mobile-visible' : 'mobile-hidden')
        : (inSettings ? '' : 'no-settings');

    function handleLogout() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            logout();
        }
    }

    function handleClose() {
        onClose();
    }

    function handleToggleTheme() {
        theme.toggle();
    }
</script>

<div class={`settings-layout ${layoutStateClass}`} id="settings-layout">
    <Bar noCenter={true}>
        <div class="settings-bar">
            {#if isMobile}
                <button class="settings-back" on:click={handleClose} aria-label="Назад">
                    <ArrowLeft size={18} />
                </button>
            {/if}
            <span>Настройки</span> <!-- TODO -->
        </div>
    </Bar>
    <div class="settings-content">
        <div class="settings-section">
            <h3 class="section-title">Профиль</h3>
            {#if currentProfile}
                <div class="profile-info">
                    <div class="profile-item">
                        <span class="label">Имя:</span>
                        <span class="value">{currentProfile.name}</span>
                    </div>
                    <div class="profile-item">
                        <span class="label">Имя пользователя:</span>
                        <span class="value">@{currentProfile.username}</span>
                    </div>
                    {#if currentProfile.bio}
                        <div class="profile-item">
                            <span class="label">О себе:</span>
                            <span class="value">{currentProfile.bio}</span>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        
        <div class="settings-section">
            <h3 class="section-title">Внешний вид</h3>
            <ClickText onClick={handleToggleTheme}>
                Тема: {currentTheme === 'dark' ? 'Тёмная' : 'Светлая'}
            </ClickText>
        </div>
        
        <div class="settings-section">
            <h3 class="section-title">Аккаунт</h3>
            <ClickText onClick={handleLogout} style="color: var(--color-danger);">
                Выйти из аккаунта
            </ClickText>
        </div>
    </div>
</div>

<style>
    .settings-layout {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 0;
        left: 40px;
        transform: translateX(0);

        min-height: 0;
        height: 100%;
        width: 320px;
        
        z-index: 3;
        overflow: hidden;
        background-image: 
            linear-gradient(var(--surface-glass), var(--surface-glass)),
            linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));

        transition: var(--transition);	
    }

    .settings-bar {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .settings-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: var(--transition);
    }

    .settings-back:hover {
        background: var(--surface-glass);
        color: var(--color-text);
    }

    .settings-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
        padding: 20px;
        gap: 24px;
    }

    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .section-title {
        font-size: 0.9em;
        font-weight: 600;
        color: var(--color-accent);
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .profile-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .profile-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .profile-item .label {
        font-size: 0.8em;
        opacity: 0.7;
    }

    .profile-item .value {
        font-size: 0.95em;
        color: var(--color-text);
    }

    .no-settings {
        transform: translateX(-100%);
        pointer-events: none;
    }

    .mobile-hidden {
        transform: translateX(100%);
        pointer-events: none;
    }

    .mobile-visible {
        transform: translateX(0);
    }

    @media (max-width: 576px) {
        .settings-layout {
            width: 100%;
            left: 0;
            z-index: 4;
        }
    }
</style>
