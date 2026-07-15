<script lang="ts">
  import { createEventDispatcher, type ComponentType } from 'svelte';
  import { User, Palette, Settings as SettingsIcon, Globe, Wifi, Bell, Keyboard } from 'lucide-svelte';
  import Modal from '$lib/components/overlays/Modal.svelte';
  
  import Avatar from '$lib/components/shared/Avatar.svelte';
  import AvatarEditorModal from '$lib/components/forms/modals/AvatarEditorModal.svelte';
  import config, { saveConfigToStorage, resetConfig } from '$lib/config';
  import { useCurrentProfile, useUpdateCurrentProfile, useUploadAvatar } from '$lib/queries/profile';
  import { theme, type Theme } from '$lib/stores/theme';
  import { accentHue, DEFAULT_HUE } from '$lib/stores/accent';
  import {
    hotkeys,
    formatHotkey,
    bindingFromEvent,
    type HotkeyAction,
    type HotkeyBinding,
    DEFAULT_HOTKEYS,
  } from '$lib/stores/hotkeys';
  import { logout, loggedIn } from '$lib/stores/auth';
  import { SUPPORTED_LOCALES, changeLocale } from '$lib/i18n';
  import { t } from 'svelte-i18n';
  import { get } from 'svelte/store';
    import Textarea from '$lib/components/shared/Textarea.svelte';

  // Props
  export let open: boolean = false;
  export let zIndex: number = 1000;

  // Types
  type SettingsSection = 'profile' | 'appearance' | 'hotkeys' | 'notifications' | 'config';
  type NavItem = { id: SettingsSection; labelKey: string; icon: ComponentType };

  // Event dispatcher
  const dispatch = createEventDispatcher<{ close: void }>();

  // Queries and stores
  const profileQuery = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const avatarMutation = useUploadAvatar();

  // Constants
  const hostPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const languageOptions = SUPPORTED_LOCALES;
  const navItems: NavItem[] = [
    { id: 'profile', labelKey: 'settings.nav.profile', icon: User },
    { id: 'appearance', labelKey: 'settings.nav.appearance', icon: Palette },
    { id: 'hotkeys', labelKey: 'settings.nav.hotkeys', icon: Keyboard },
    { id: 'notifications', labelKey: 'settings.nav.notifications', icon: Bell },
    { id: 'config', labelKey: 'settings.nav.config', icon: SettingsIcon },
  ];

  const HOTKEY_ACTIONS: { action: HotkeyAction; labelKey: string }[] = [
    { action: 'edit_last_message', labelKey: 'settings.hotkeys.edit_last_message' },
    { action: 'toggle_settings', labelKey: 'settings.hotkeys.toggle_settings' },
  ];

  // State
  let activeSection: SettingsSection = 'profile';
  let profileInitialized = false;
  let localName = '';
  let localBio = '';
  let profileBaselineName = '';
  let profileBaselineBio = '';
  let profileError: string | null = null;
  let avatarError: string | null = null;
  let localConfig: any = null;
  let configInitialized = false;
  let isConfigDirty = false;
  let isSavingConfig = false;
  let configError: string | null = null;
  let showAvatarEditor = false;
  let avatarEditFile: File | null = null;
  let capturingHotkey: HotkeyAction | null = null;

  // DOM refs
  let avatarInput: HTMLInputElement | null = null;

  // Computed values
  $: currentProfile = $profileQuery?.data ?? null;
  $: profileLoading = Boolean($profileQuery?.isLoading);
  $: profileQueryError = $profileQuery?.error ? String($profileQuery.error) : null;
  $: filteredNavItems = navItems.filter(item => item.id !== 'profile' || $loggedIn);
  $: serverPreview = localConfig ? buildServerUrl(localConfig) : '';
  $: websocketPreview = localConfig ? buildWebSocketUrl(localConfig) : '';
  $: isProfileDirty = profileInitialized && (
    localName.trim() !== profileBaselineName.trim() ||
    localBio.trim() !== profileBaselineBio.trim()
  );
  $: currentTheme = $theme as Theme;

  // Reactive statements
  $: if (open && currentProfile && !profileInitialized) {
    localName = currentProfile.name ?? '';
    localBio = currentProfile.bio ?? '';
    profileBaselineName = localName;
    profileBaselineBio = localBio;
    profileInitialized = true;
    profileError = null;
  }

  $: if (!open) {
    profileInitialized = false;
    avatarError = null;
    profileError = null;
    configError = null;
    localConfig = null;
    configInitialized = false;
    isConfigDirty = false;
    stopCaptureHotkey();
    activeSection = $loggedIn ? 'profile' : 'appearance';
  }

  $: if (open && !configInitialized) {
    localConfig = structuredClone($config);
    isConfigDirty = false;
    configInitialized = true;
  }

  // Event handlers
  function handleClose() {
    dispatch('close');
  }

  function focusSection(section: SettingsSection) {
    activeSection = section;
  }

  async function handleProfileSave() {
    if (!currentProfile) return;
    profileError = null;
    try {
      await $updateProfile.mutateAsync({
        name: localName.trim() || null,
        bio: localBio.trim() ? localBio.trim() : null,
      });
      profileBaselineName = localName.trim();
      profileBaselineBio = localBio.trim();
    } catch (error) {
      profileError = error instanceof Error ? error.message : get(t)('settings.profile.updateError');
    }
  }

  function openAvatarPicker() {
    avatarInput?.click();
  }

  function handleAvatarChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    avatarError = null;
    avatarEditFile = file;
    showAvatarEditor = true;
    target.value = '';
  }

  async function handleAvatarEdited(event: CustomEvent<{ file: File }>) {
    avatarError = null;
    try {
      await $avatarMutation.mutateAsync(event.detail.file);
    } catch (error) {
      avatarError = error instanceof Error ? error.message : get(t)('settings.profile.avatarError');
    } finally {
      showAvatarEditor = false;
      avatarEditFile = null;
    }
  }

  function handleLogout() {
    logout();
    dispatch('close');
  }

  async function handleConfigSave() {
    if (!localConfig || !isConfigDirty) return;
    
    isSavingConfig = true;
    configError = null;
    
    try {
      const serverChanged = 
        localConfig.server.host !== $config.server.host ||
        localConfig.server.port !== $config.server.port ||
        localConfig.server.secure !== $config.server.secure ||
        localConfig.server.apiPath !== $config.server.apiPath ||
        localConfig.server.apiVer !== $config.server.apiVer;
      
      config.set(localConfig);
      saveConfigToStorage();
      isConfigDirty = false;
      
      if (serverChanged) {
        const { session } = await import('$lib/session');
        const { queryClient } = await import('$lib/query');
        const { wsService } = await import('$lib/ws-service');
        
        wsService.disconnect();
        queryClient.clear();
        session.clearSession();
        dispatch('close');
      }
    } catch (error) {
      configError = error instanceof Error ? error.message : 'Failed to save configuration';
    } finally {
      isSavingConfig = false;
    }
  }

  function stopCaptureHotkey() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onHotkeyCapture, true);
    }
    capturingHotkey = null;
  }

  function startCaptureHotkey(action: HotkeyAction) {
    if (capturingHotkey === action) {
      stopCaptureHotkey();
      return;
    }
    stopCaptureHotkey();
    capturingHotkey = action;
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onHotkeyCapture, true);
    }
  }

  function onHotkeyCapture(event: KeyboardEvent) {
    if (!capturingHotkey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stopCaptureHotkey();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const binding = bindingFromEvent(event);
    if (!binding) return;
    hotkeys.updateBinding(capturingHotkey, binding);
    stopCaptureHotkey();
  }

  function resetHotkeys() {
    hotkeys.reset();
    stopCaptureHotkey();
  }

  function setAccentHue(value: number) {
    accentHue.set(value);
  }

  function handleConfigReset() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetConfig();
      localConfig = structuredClone($config);
      isConfigDirty = false;
    }
  }

  // Utility functions
  function validatePort(port: number): boolean {
    return port > 0 && port <= 65535;
  }

  function validateHost(host: string): boolean {
    if (!host) return false;
    return hostPattern.test(host);
  }

  function buildServerUrl(conf: any): string {
    const protocol = conf.server.secure ? 'https' : 'http';
    return `${protocol}://${conf.server.host}:${conf.server.port}`;
  }

  function buildWebSocketUrl(conf: any): string {
    const protocol = conf.server.secure ? 'wss' : 'ws';
    return `${protocol}://${conf.server.host}:${conf.server.port}${conf.server.apiPath}/${conf.server.apiVer}/ws`;
  }
  
  function checkIfConfigDirty() {
    if (!localConfig) return;
    
    isConfigDirty = JSON.stringify(localConfig) !== JSON.stringify($config);
  }

  function updateServerField(field: keyof typeof $config.server, value: any) {
    if (!localConfig) return;

    localConfig = {
      ...localConfig,
      server: {
        ...localConfig.server,
        [field]: value,
      },
    };
    checkIfConfigDirty();
  }

  function updateWebsocketField(field: keyof typeof $config.websocket, value: any) {
    if (!localConfig) return;

    localConfig = {
      ...localConfig,
      websocket: {
        ...localConfig.websocket,
        [field]: value,
      },
    };
    checkIfConfigDirty();
  }

  function updateNotificationsField(field: keyof typeof $config.app.notifications, value: any) {
    if (!localConfig) return;

    localConfig = {
      ...localConfig,
      app: {
        ...localConfig.app,
        notifications: {
          ...localConfig.app.notifications,
          [field]: value,
        },
      },
    };
    checkIfConfigDirty();
  }

  function updateAppField(field: keyof typeof $config.app, value: any) {
    if (!localConfig) return;

    localConfig = {
      ...localConfig,
      app: {
        ...localConfig.app,
        [field]: value,
      },
    };
    checkIfConfigDirty();

    if (field === 'defaultLanguage' && typeof value === 'string') {
      changeLocale(value);
    }
  }

  function formatPort(value: string): number {
    const port = parseInt(value, 10);
    return Number.isNaN(port) ? 80 : Math.min(Math.max(port, 1), 65535);
  }

  function toggleTheme() {
    theme.toggle();
  }
</script>

<Modal
  open={open}
  title={$t('settings.title')}
  showClose={true}
  maxWidth="720px"
  zIndex={zIndex}
  on:close={handleClose}
>
  <div class="settings-modal">
    <nav class="settings-nav">
      {#each filteredNavItems as item}
        <button
          class:active={activeSection === item.id}
          on:click={() => focusSection(item.id)}
        >
          <svelte:component this={item.icon} size={16} />
          <span>{$t(item.labelKey)}</span>
        </button>
      {/each}
    </nav>

    <div class="settings-content">
      {#if activeSection === 'profile'}
        <section class="section">
          <h3>{$t('settings.profile.sectionTitle')}</h3>

          {#if profileLoading}
            <div class="section-hint">{$t('settings.profile.loading')}</div>
          {:else if profileQueryError}
            <div class="section-error">{profileQueryError}</div>
          {:else if currentProfile}
            <div class="profile-block">
              <div class="profile-group">
                <div class="group-header">
                  <User size={18} />
                  <span>{$t('settings.profile.avatar')}</span>
                </div>
                <div class="avatar-block">
                  <Avatar avatarUrl={currentProfile.avatar_url} size="xlarge" />
                  <button
                    on:click={openAvatarPicker}
                    disabled={$avatarMutation.isPending}
                    class="avatar-button btn"
                  >
                    <span>{$t('settings.profile.updateAvatar')}</span>
                  </button>
                  <input
                    class="file-input"
                    type="file"
                    accept="image/*"
                    bind:this={avatarInput}
                    on:change={handleAvatarChange}
                  />
                  {#if avatarError}
                    <div class="section-error">{avatarError}</div>
                  {/if}
                </div>
              </div>

              <div class="profile-group">
                <div class="group-header">
                  <User size={18} />
                  <span>{$t('settings.profile.information')}</span>
                </div>
                <div class="profile-form">
                  <label for="profile-name" class="field-label">{$t('settings.profile.nameLabel')}</label>
                  <input
                    id="profile-name"
                    type="text"
                    placeholder={$t('settings.profile.namePlaceholder')}
                    bind:value={localName}
                  />

                  <label for="profile-username" class="readonly-label">{$t('settings.profile.usernameLabel')}</label>
                  <input
                    id="profile-username"
                    class="readonly-input"
                    value={`@${currentProfile.username}`}
                    readonly
                  />

                  <label for="profile-bio" class="textarea-label">{$t('settings.profile.bioLabel')}</label>
                  <Textarea
                    id="profile-bio"
                    bind:value={localBio}
                    placeholder={$t('settings.profile.bioPlaceholder')}
                    rows={4}
                  />

                  {#if profileError}
                    <div class="section-error">{profileError}</div>
                  {/if}

                  <div class="section-actions">
                    <button
                      class="btn primary"
                      on:click={handleProfileSave}
                      disabled={!isProfileDirty || $updateProfile.isPending}
                    >
                      {#if $updateProfile.isPending}
                        <span>{$t('settings.profile.saving')}</span>
                      {:else}
                        <span>{$t('settings.profile.save')}</span>
                      {/if}
                    </button>
                  </div>
                </div>
              </div>

              <div class="profile-group">
                <div class="group-header">
                  <SettingsIcon size={18} />
                  <span>{$t('settings.profile.account')}</span>
                </div>
                <div class="account-block">
                  <button class="btn danger" on:click={handleLogout}>
                    <span>{$t('settings.profile.logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          {/if}

          <div class="separator"></div>
        </section>

      {:else if activeSection === 'appearance'}
        <section class="section">
          <h3>{$t('settings.appearance.sectionTitle')}</h3>

          <div class="appearance-block">
            <div class="appearance-row">
              <div>
                <div class="row-title">{$t('settings.appearance.themeTitle')}</div>
                <div class="row-hint">
                  {currentTheme === 'dark'
                    ? $t('settings.appearance.themeCurrentDark')
                    : $t('settings.appearance.themeCurrentLight')}
                </div>
              </div>
              <button class ="btn" on:click={toggleTheme}>
                <span>{$t('settings.appearance.toggle')}</span>
              </button>
            </div>

            <div class="appearance-row accent-row">
              <div class="accent-info">
                <div class="row-title">{$t('settings.appearance.accentTitle')}</div>
                <div class="row-hint">{$t('settings.appearance.accentHint')}</div>
              </div>
              <div class="accent-controls">
                <div
                  class="accent-swatch"
                  style={`background: hsl(${$accentHue}, 45%, 52%)`}
                  title={`HSL(${$accentHue}, 45%, 52%)`}
                ></div>
                <input
                  class="hue-slider"
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={$accentHue}
                  on:input={(e) => setAccentHue(Number(e.currentTarget.value))}
                  aria-label={$t('settings.appearance.accentTitle')}
                />
                <button class="btn text" on:click={() => setAccentHue(DEFAULT_HUE)}>
                  <span>{$t('settings.appearance.accentReset')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      {:else if activeSection === 'hotkeys'}
        <section class="section">
          <h3>{$t('settings.hotkeys.sectionTitle')}</h3>
          <div class="row-hint">{$t('settings.hotkeys.sectionHint')}</div>

          <div class="appearance-block">
            {#each HOTKEY_ACTIONS as item}
              <div class="appearance-row">
                <div>
                  <div class="row-title">{$t(item.labelKey)}</div>
                </div>
                <button
                  type="button"
                  class="hotkey-capture"
                  class:capturing={capturingHotkey === item.action}
                  on:click={() => startCaptureHotkey(item.action)}
                >
                  {#if capturingHotkey === item.action}
                    {$t('settings.hotkeys.pressKey')}
                  {:else}
                    {formatHotkey($hotkeys[item.action])}
                  {/if}
                </button>
              </div>
            {/each}

            <div class="section-actions">
              <button class="btn text" on:click={resetHotkeys}>
                <span>{$t('settings.hotkeys.reset')}</span>
              </button>
            </div>
          </div>
        </section>

      {:else if activeSection === 'notifications'}
        <section class="section">
          <h3>{$t('settings.notifications.sectionTitle')}</h3>

          <div class="appearance-block">
            <div class="appearance-row">
              <div>
                <div class="row-title">{$t('settings.notifications.enableTitle')}</div>
                <div class="row-hint">{$t('settings.notifications.enableHint')}</div>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  checked={localConfig?.app?.notifications?.enabled ?? true}
                  on:change={(e) => updateNotificationsField('enabled', e.currentTarget?.checked ?? false)}
                />
                <span class="slider"></span>
              </label>
            </div>

            <div class="appearance-row">
              <div>
                <div class="row-title">{$t('settings.notifications.soundTitle')}</div>
                <div class="row-hint">{$t('settings.notifications.soundHint')}</div>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  checked={localConfig?.app?.notifications?.sound ?? true}
                  on:change={(e) => updateNotificationsField('sound', e.currentTarget?.checked ?? false)}
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

      {:else if activeSection === 'config'}
        <section class="section">
          <h3>{$t('settings.config.sectionTitle')}</h3>

          {#if localConfig}
            <div class="config-block">
              {#if isConfigDirty}
                <div class="config-prompt">
                  <div class="prompt-text">{$t('settings.config.savePrompt')}</div>
                  <button
                    class="btn primary"
                    on:click={handleConfigSave}
                    disabled={isSavingConfig}
                  >
                    {#if isSavingConfig}
                      <span>{$t('settings.config.saving')}</span>
                    {:else}
                      <span>{$t('settings.config.save')}</span>
                    {/if}
                  </button>
                </div>
              {/if}

              <div class="config-group">
                <div class="group-header">
                  <Globe size={18} />
                  <span>{$t('settings.config.api')}</span>
                </div>

                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    checked={localConfig.server.secure}
                    on:change={(e) => updateServerField('secure', e.currentTarget?.checked ?? false)}
                  />
                  {$t('settings.config.useHttps')}
                </label>

                <label class="field-label" for="connection-host">{$t('settings.config.host')}</label>
                <input
                  id="connection-host"
                  type="text"
                  class:invalid={!validateHost(localConfig.server.host)}
                  value={localConfig.server.host}
                  on:input={(e) => updateServerField('host', e.currentTarget?.value ?? '')}
                />
                {#if !validateHost(localConfig.server.host)}
                  <div class="field-error">{$t('settings.config.hostError')}</div>
                {/if}

                <label class="field-label" for="connection-port">{$t('settings.config.port')}</label>
                <input
                  id="connection-port"
                  type="number"
                  min="1"
                  max="65535"
                  class:invalid={!validatePort(localConfig.server.port)}
                  value={localConfig.server.port}
                  on:input={(e) => updateServerField('port', formatPort(e.currentTarget?.value ?? ''))}
                />
                {#if !validatePort(localConfig.server.port)}
                  <div class="field-error">{$t('settings.config.portError')}</div>
                {/if}

                <label class="field-label" for="connection-api-path">{$t('settings.config.apiPath')}</label>
                <input
                  id="connection-api-path"
                  type="text"
                  value={localConfig.server.apiPath}
                  on:input={(e) => updateServerField('apiPath', e.currentTarget?.value ?? '')}
                />

                <label class="field-label" for="connection-api-ver">{$t('settings.config.apiVersion')}</label>
                <input
                  id="connection-api-ver"
                  type="text"
                  value={localConfig.server.apiVer}
                  on:input={(e) => updateServerField('apiVer', e.currentTarget?.value ?? '')}
                />

                <div class="url-preview">
                  <strong>{$t('settings.config.restPreview')}:</strong> {serverPreview}
                </div>
              </div>

              <div class="config-group">
                <div class="group-header">
                  <Wifi size={18} />
                  <span>{$t('settings.config.websocket')}</span>
                </div>

                <label class="field-label" for="connection-reconnect">{$t('settings.config.wsDelay')}</label>
                <input
                  id="connection-reconnect"
                  type="number"
                  min="1000"
                  max="30000"
                  value={localConfig.websocket.reconnectDelay}
                  on:input={(e) => updateWebsocketField('reconnectDelay', parseInt(e.currentTarget?.value ?? '') || 3000)}
                />

                <div class="url-preview">
                  <strong>{$t('settings.config.wsPreview')}:</strong> {websocketPreview}
                </div>
              </div>

              <div class="config-group">
                <div class="group-header">
                  <SettingsIcon size={18} />
                  <span>{$t('settings.config.app')}</span>
                </div>

                <label class="field-label" for="connection-language">{$t('settings.config.defaultLanguage')}</label>
                <select
                  id="connection-language"
                  value={localConfig.app.defaultLanguage}
                  on:change={(e) => updateAppField('defaultLanguage', e.currentTarget?.value ?? '')}
                >
                  {#each languageOptions as option}
                    <option value={option}>{$t(`common.language.${option}`)}</option>
                  {/each}
                </select>

                <label class="field-label" for="connection-version">{$t('settings.config.version')}</label>
                <input id="connection-version" type="text" value={localConfig.app.version} readonly />
              </div>

              {#if configError}
                <div class="section-error">{configError}</div>
              {/if}

              <div class="section-actions">
                <button class="btn text" on:click={handleConfigReset} disabled={isSavingConfig}>
                  <span>{$t('settings.config.reset')}</span>
                </button>
              </div>
            </div>
          {:else}
            <div class="section-hint">{$t('settings.config.configUnavailable')}</div>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</Modal>

{#if showAvatarEditor && avatarEditFile}
  <AvatarEditorModal
    open={showAvatarEditor}
    file={avatarEditFile}
    zIndex={zIndex + 50}
    on:close={() => {
      showAvatarEditor = false;
      avatarEditFile = null;
    }}
    on:save={handleAvatarEdited}
  />
{/if}

<style>
  .settings-modal {
    display: flex;
    min-height: 420px;
    gap: 20px;
  }

  .settings-nav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 180px;
    border-right: 1px solid var(--color-border);
    padding-right: 20px;
  }

  .settings-nav button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: none;
    border: none;
    border-radius: 8px;
    color: var(--color-text);
    background: var(--surface-glass);
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    text-align: left;
  }

  .settings-nav button:hover {
    backdrop-filter: var(--hover-filter);
  }

  .settings-nav button.active {
    background: var(--color-accent);
    color: var(--color-button-text);
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section h3 {
    margin: 0;
    color: var(--color-text);
  }

  .profile-block {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .avatar-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .file-input {
    display: none;
  }

  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }

  .readonly-label,
  .textarea-label,
  .field-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .readonly-input,
  textarea,
  input[type='text'],
  input[type='number'],
  select {
    box-sizing: border-box;
    background: var(--color-bg-elevated);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
    outline: none;
    padding: 10px;
    transition: var(--transition);
    width: 100%;
  }

  textarea {
    resize: vertical;
    min-height: 120px;
  }

  .readonly-input {
    cursor: default;
  }

  input:focus,
  textarea:focus,
  select:focus {
    box-shadow: 0 0 0 2px var(--color-accent-soft);
  }

  .section-error {
    background: var(--color-danger-soft);
    color: var(--color-danger);
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .section-hint {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .section-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .separator {
    height: 1px;
    background: var(--color-border);
    opacity: 0.4;
  }

  .account-block {
    display: flex;
    justify-content: flex-start;
  }

  .appearance-block {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .appearance-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    border-radius: var(--radius-sm);
    background: var(--surface-glass);
  }

  .row-title {
    font-weight: 600;
  }

  .row-hint {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .config-block {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .config-prompt {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    background-image: 
            linear-gradient(var(--surface-glass), var(--surface-glass)),
            linear-gradient(var(--color-bg-elevated), var(--color-bg-elevated));
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 4px 12px;
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: center;
    justify-content: space-between;
    max-width: 500px;
    width: calc(100vw - 40px);
  }

  .prompt-text {
    color: var(--color-text);
    text-align: center;
  }

  .profile-group,
  .config-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-sm);
    background: var(--surface-glass);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-error {
    color: var(--color-danger);
    font-size: 0.85rem;
  }

  .url-preview {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    padding: 10px;
    border-radius: var(--radius-sm);
    word-break: break-all;
  }

  input.invalid {
    box-shadow: 0 0 0 2px var(--color-danger-soft);
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-border);
    transition: 0.3s;
    border-radius: 24px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: var(--color-accent);
  }

  input:checked + .slider:before {
    transform: translateX(24px);
  }

  .accent-row {
    flex-direction: column;
    align-items: stretch;
  }

  .accent-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .accent-swatch {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid var(--color-border);
    box-shadow: 0 0 0 2px var(--color-accent-soft);
  }

  .hue-slider {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    outline: none;
    appearance: none;
    background: linear-gradient(
      to right,
      hsl(0, 70%, 50%),
      hsl(60, 70%, 50%),
      hsl(120, 70%, 50%),
      hsl(180, 70%, 50%),
      hsl(240, 70%, 50%),
      hsl(300, 70%, 50%),
      hsl(360, 70%, 50%)
    );
  }

  .hue-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--color-accent);
    cursor: pointer;
  }

  .hotkey-capture {
    min-width: 120px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: 1px dashed var(--color-border);
    background: var(--color-bg-elevated);
    color: var(--color-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85rem;
    cursor: pointer;
    text-align: center;
  }

  .hotkey-capture:hover {
    border-color: var(--color-accent);
  }

  .hotkey-capture.capturing {
    border-style: solid;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-soft);
    color: var(--color-accent);
  }

  @media (max-width: 640px) {
    .settings-modal {
      flex-direction: column;
    }

    .settings-nav {
      flex-direction: row;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      padding-right: 0;
      padding-bottom: 12px;
      overflow-x: auto;
    }

    .settings-content {
      padding-right: 0;
      padding-bottom: 80px;
    }

    .appearance-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>