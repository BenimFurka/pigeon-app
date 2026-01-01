<script lang="ts">
  import { createEventDispatcher, type ComponentType } from 'svelte';
  import { User, Palette, Settings as SettingsIcon, Globe, Wifi, LogOut, ImagePlus, RefreshCw, Save, Loader2 } from 'lucide-svelte';
  import Modal from '../../ui/Modal.svelte';
  import Button from '../../ui/Button.svelte';
  import Avatar from '../Avatar.svelte';
  import config, { saveConfigToStorage, resetConfig } from '../../../config';
  import { useCurrentProfile, useUpdateCurrentProfile, useUploadAvatar } from '../../../queries/profile';
  import { theme, type Theme } from '../../../stores/theme';
  import { logout } from '../../../stores/auth';
  import { SUPPORTED_LOCALES, changeLocale } from '$lib/i18n';
  import { t } from 'svelte-i18n';
  import { get } from 'svelte/store';

  export let open: boolean = false;
  export let zIndex: number = 1000;

  type SettingsSection = 'profile' | 'appearance' | 'config';

  const dispatch = createEventDispatcher<{ close: void }>();
  const profileQuery = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const avatarMutation = useUploadAvatar();

  let activeSection: SettingsSection = 'profile';
  let profileInitialized = false;
  let localName = '';
  let localBio = '';
  let profileBaselineName = '';
  let profileBaselineBio = '';
  let profileError: string | null = null;
  let avatarError: string | null = null;
  let avatarInput: HTMLInputElement | null = null;

  let localConfig: any = null;
  let configInitialized = false;
  let isConfigDirty = false;
  let isSavingConfig = false;
  let configError: string | null = null;

  type NavItem = { id: SettingsSection; labelKey: string; icon: ComponentType };
  const navItems: NavItem[] = [
    { id: 'profile', labelKey: 'settings.nav.profile', icon: User },
    { id: 'appearance', labelKey: 'settings.nav.appearance', icon: Palette },
    { id: 'config', labelKey: 'settings.nav.config', icon: SettingsIcon },
  ];

  const languageOptions = SUPPORTED_LOCALES;

  $: currentProfile = $profileQuery?.data ?? null;
  $: profileLoading = Boolean($profileQuery?.isLoading);
  $: profileQueryError = $profileQuery?.error ? String($profileQuery.error) : null;

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
    activeSection = 'profile';
  }

  $: if (open && !configInitialized) {
    localConfig = structuredClone($config);
    isConfigDirty = false;
    configInitialized = true;
  }

  const hostPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

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

  $: serverPreview = localConfig ? buildServerUrl(localConfig) : '';
  $: websocketPreview = localConfig ? buildWebSocketUrl(localConfig) : '';

  $: isProfileDirty = profileInitialized && (
    localName.trim() !== profileBaselineName.trim() ||
    localBio.trim() !== profileBaselineBio.trim()
  );

  $: currentTheme = $theme as Theme;

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

  async function handleAvatarChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    avatarError = null;
    try {
      await $avatarMutation.mutateAsync(file);
    } catch (error) {
      avatarError = error instanceof Error ? error.message : get(t)('settings.profile.avatarError');
    } finally {
      target.value = '';
    }
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
    isConfigDirty = true;
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
    isConfigDirty = true;
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
    isConfigDirty = true;

    if (field === 'defaultLanguage' && typeof value === 'string') {
      changeLocale(value);
    }
  }

  function formatPort(value: string): number {
    const port = parseInt(value, 10);
    return Number.isNaN(port) ? 80 : Math.min(Math.max(port, 1), 65535);
  }

  async function handleConfigSave() {
    if (!localConfig) return;
    configError = null;
    isSavingConfig = true;
    try {
      config.set(localConfig);
      saveConfigToStorage();
      isConfigDirty = false;
    } catch (error) {
      configError = error instanceof Error ? error.message : get(t)('settings.config.saveError');
    } finally {
      isSavingConfig = false;
    }
  }

  function handleConfigReset() {
    if (!confirm(get(t)('settings.confirmReset'))) {
      return;
    }
    resetConfig();
    localConfig = structuredClone($config);
    isConfigDirty = false;
  }

  function handleLogout() {
    logout();
    handleClose();
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
      {#each navItems as item}
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
              <div class="avatar-block">
                <Avatar avatarUrl={currentProfile.avatar_url} size="xlarge" />
                <Button
                  variant="outline"
                  on:click={openAvatarPicker}
                  disabled={$avatarMutation.isPending}
                  className="avatar-button"
                >
                  <span>{$t('settings.profile.updateAvatar')}</span>
                </Button>
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
                <textarea
                  id="profile-bio"
                  bind:value={localBio}
                  placeholder={$t('settings.profile.bioPlaceholder')}
                  rows={4}
                ></textarea>

                {#if profileError}
                  <div class="section-error">{profileError}</div>
                {/if}

                <div class="section-actions">
                  <Button
                    variant="primary"
                    on:click={handleProfileSave}
                    disabled={!isProfileDirty || $updateProfile.isPending}
                  >
                    {#if $updateProfile.isPending}
                      <span>{$t('settings.profile.saving')}</span>
                    {:else}
                      <span>{$t('settings.profile.save')}</span>
                    {/if}
                  </Button>
                </div>
              </div>
            </div>
          {/if}

          <div class="separator"></div>

          <div class="account-block">
            <Button variant="danger" on:click={handleLogout}>
              <span>{$t('settings.profile.logout')}</span>
            </Button>
          </div>
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
              <Button variant="outline" on:click={toggleTheme}>
                <span>{$t('settings.appearance.toggle')}</span>
              </Button>
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
                  <Button
                    variant="primary"
                    on:click={handleConfigSave}
                    disabled={isSavingConfig}
                  >
                    {#if isSavingConfig}
                      <span>{$t('settings.config.saving')}</span>
                    {:else}
                      <span>{$t('settings.config.save')}</span>
                    {/if}
                  </Button>
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
                    on:change={(e) => updateServerField('secure', e.target.checked)}
                  />
                  {$t('settings.config.useHttps')}
                </label>

                <label class="field-label" for="connection-host">{$t('settings.config.host')}</label>
                <input
                  id="connection-host"
                  type="text"
                  class:invalid={!validateHost(localConfig.server.host)}
                  value={localConfig.server.host}
                  on:input={(e) => updateServerField('host', e.target.value)}
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
                  on:input={(e) => updateServerField('port', formatPort(e.target.value))}
                />
                {#if !validatePort(localConfig.server.port)}
                  <div class="field-error">{$t('settings.config.portError')}</div>
                {/if}

                <label class="field-label" for="connection-api-path">{$t('settings.config.apiPath')}</label>
                <input
                  id="connection-api-path"
                  type="text"
                  value={localConfig.server.apiPath}
                  on:input={(e) => updateServerField('apiPath', e.target.value)}
                />

                <label class="field-label" for="connection-api-ver">{$t('settings.config.apiVersion')}</label>
                <input
                  id="connection-api-ver"
                  type="text"
                  value={localConfig.server.apiVer}
                  on:input={(e) => updateServerField('apiVer', e.target.value)}
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
                  on:input={(e) => updateWebsocketField('reconnectDelay', parseInt(e.target.value) || 3000)}
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
                  on:change={(e) => updateAppField('defaultLanguage', e.target.value)}
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
                <Button variant="text" on:click={handleConfigReset} disabled={isSavingConfig}>
                  <span>{$t('settings.config.reset')}</span>
                </Button>
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
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    text-align: left;
  }

  .settings-nav button:hover {
    background: var(--surface-glass);
  }

  .settings-nav button.active {
    background: var(--color-accent);
    color: var(--color-text);
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

  @media (min-width: 720px) {
    .profile-block {
      flex-direction: row;
    }
  }

  .avatar-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .avatar-button {
    display: flex;
    align-items: center;
    gap: 8px;
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

  .spinner {
    animation: spin 1s linear infinite;
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
    }

    .appearance-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>