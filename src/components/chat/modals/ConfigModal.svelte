<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Save, RefreshCw, Globe, Wifi, Settings } from 'lucide-svelte';
  import Modal from '../../ui/Modal.svelte';
  import { config, saveConfigToStorage, resetConfig, getServerUrl, getWebSocketUrl } from '../../../config'
  import Button from '../../ui/Button.svelte';

  export let open: boolean = false;
  export let zIndex: number = 1000;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { config: any };
  }>();

  let localConfig: any = null;
  let isDirty = false;

  $: if (open && !localConfig) {
    localConfig = structuredClone($config);
    isDirty = false;
  }

  $: if (!open) {
    localConfig = null;
    isDirty = false;
  }

  function handleClose() {
    if (isDirty) {
      if (!confirm('У вас есть несохраненные изменения. Закрыть без сохранения?')) {
        return;
      }
    }
    dispatch('close');
  }

  function handleSave() {
    if (!localConfig) return;
    
    config.set(localConfig);
    saveConfigToStorage();
    isDirty = false;
    dispatch('save', { config: localConfig });
    handleClose();
  }

  function handleReset() {
    if (confirm('Сбросить настройки к значениям по умолчанию?')) {
      resetConfig();
      localConfig = structuredClone($config);
      isDirty = false;
    }
  }

  function updateServerField(field: keyof typeof $config.server, value: any) {
    if (!localConfig) return;
    
    localConfig = {
      ...localConfig,
      server: {
        ...localConfig.server,
        [field]: value
      }
    };
    isDirty = true;
  }

  function updateWebsocketField(field: keyof typeof $config.websocket, value: any) {
    if (!localConfig) return;
    
    localConfig = {
      ...localConfig,
      websocket: {
        ...localConfig.websocket,
        [field]: value
      }
    };
    isDirty = true;
  }

  function updateAppField(field: keyof typeof $config.app, value: any) {
    if (!localConfig) return;
    
    localConfig = {
      ...localConfig,
      app: {
        ...localConfig.app,
        [field]: value
      }
    };
    isDirty = true;
  }

  function validatePort(port: number): boolean {
    return port > 0 && port <= 65535;
  }

  function validateHost(host: string): boolean {
    if (!host) return false;
    const hostPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    return hostPattern.test(host);
  }

  let activeSection: 'server' | 'websocket' | 'app' = 'server';
  
  $: currentServerUrl = localConfig ? getServerUrl() : '';
  $: currentWebSocketUrl = localConfig ? getWebSocketUrl() : '';
  
  function formatPort(value: string): number {
    const port = parseInt(value, 10);
    return isNaN(port) ? 80 : Math.min(Math.max(port, 1), 65535);
  }
</script>

<Modal
  open={open}
  title="Настройки конфигурации"
  showClose={true}
  maxWidth="600px"
  zIndex={zIndex}
  on:close={handleClose}
>
  {#if localConfig}
    <div class="config-container">
      <nav class="config-nav">
        <button
          class:active={activeSection === 'server'}
          on:click={() => activeSection = 'server'}
        >
          <Globe size={16} />
          <span>Сервер</span>
        </button>
        <button
          class:active={activeSection === 'websocket'}
          on:click={() => activeSection = 'websocket'}
        >
          <Wifi size={16} />
          <span>WebSocket</span>
        </button>
        <button
          class:active={activeSection === 'app'}
          on:click={() => activeSection = 'app'}
        >
          <Settings size={16} />
          <span>Приложение</span>
        </button>
      </nav>

      <div class="config-content">
        {#if activeSection === 'server'}
          <div class="config-section">
            <h3>Настройки сервера</h3>
            
            <div class="form-field">
              <label for="secure">
                <input
                  id="secure"
                  type="checkbox"
                  checked={localConfig.server.secure}
                  on:change={(e) => updateServerField('secure', e.target.checked)}
                />
                Использовать HTTPS/WSS
              </label>
              <div class="hint">
                {localConfig.server.secure ? 'Будут использоваться https:// и wss://' : 'Будут использоваться http:// и ws://'}
              </div>
            </div>

            <div class="form-field">
              <label for="host">Хост сервера</label>
              <input
                id="host"
                type="text"
                value={localConfig.server.host}
                on:input={(e) => updateServerField('host', e.target.value)}
                class:invalid={!validateHost(localConfig.server.host)}
              />
              {#if !validateHost(localConfig.server.host)}
                <div class="error">Некорректный хост (разрешены: localhost, IP адреса, домены)</div>
              {/if}
            </div>

            <div class="form-field">
              <label for="port">Порт</label>
              <input
                id="port"
                type="number"
                value={localConfig.server.port}
                on:input={(e) => updateServerField('port', formatPort(e.target.value))}
                min="1"
                max="65535"
                class:invalid={!validatePort(localConfig.server.port)}
              />
              {#if !validatePort(localConfig.server.port)}
                <div class="error">Порт должен быть от 1 до 65535</div>
              {/if}
            </div>

            <div class="form-field">
              <label for="apiPath">Путь к API</label>
              <input
                id="apiPath"
                type="text"
                value={localConfig.server.apiPath}
                on:input={(e) => updateServerField('apiPath', e.target.value)}
              />
            </div>

            <div class="form-field">
              <label for="apiVer">Версия API</label>
              <input
                id="apiVer"
                type="text"
                value={localConfig.server.apiVer}
                on:input={(e) => updateServerField('apiVer', e.target.value)}
              />
            </div>

            <div class="url-preview">
              <strong>Сервер URL:</strong> {currentServerUrl}
            </div>
          </div>

        {:else if activeSection === 'websocket'}
          <div class="config-section">
            <h3>Настройки WebSocket</h3>
            
            <div class="form-field">
              <label for="reconnectDelay">Задержка переподключения (мс)</label>
              <input
                id="reconnectDelay"
                type="number"
                value={localConfig.websocket.reconnectDelay}
                on:input={(e) => updateWebsocketField('reconnectDelay', parseInt(e.target.value) || 3000)}
                min="1000"
                max="30000"
              />
              <div class="hint">
                При потере соединения, клиент будет пытаться переподключиться через указанное время
              </div>
            </div>

            <div class="url-preview">
              <strong>WebSocket URL:</strong> {currentWebSocketUrl}
            </div>
          </div>

        {:else if activeSection === 'app'}
          <div class="config-section">
            <h3>Настройки приложения</h3>
            
            <div class="form-field">
              <label for="defaultLanguage">Язык по умолчанию</label>
              <select
                id="defaultLanguage"
                value={localConfig.app.defaultLanguage}
                on:change={(e) => updateAppField('defaultLanguage', e.target.value)}
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>

            <div class="form-field">
              <label for="version">Версия приложения</label>
              <input
                id="version"
                type="text"
                value={localConfig.app.version}
                disabled
              />
              <div class="hint">
                Версия доступна только для чтения
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div slot="footer" class="config-footer">
    <Button
      variant="text"
      on:click={handleReset}
    >
      Сбросить
    </Button>
    
    <div class="footer-actions">
      {#if isDirty}
        <div class="unsaved-changes">
          Есть несохраненные изменения
        </div>
      {/if}
      <Button
        variant="primary"
        on:click={handleSave}
        disabled={!isDirty}
      >
        Сохранить
      </Button>
    </div>
  </div>
</Modal>

<style>
  .config-container {
    display: flex;
    min-height: 400px;
    gap: 20px;
  }

  .config-nav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 160px;
    border-right: 1px solid var(--color-border);
    padding-right: 20px;
  }

  .config-nav button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .config-nav button:hover {
    background: var(--surface-glass);
  }

  .config-nav button.active {
    background: var(--color-primary);
    color: white;
  }

  .config-content {
    flex: 1;
    overflow-y: auto;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  h3 {
    margin: 0 0 16px;
    color: var(--color-text);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  input[type="text"],
  input[type="number"],
  select {
    box-sizing: border-box;
    background: var(--color-bg-elevated);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 14px;
    outline: none;
    padding-left: 8px;
    margin: auto;
    transition: var(--transition);
    width: 100%;
    height: 40px;
  }

  input:focus,
  select:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-accent-soft);
    border-color: var(--color-accent);
  }

  input[type="checkbox"] {
    margin: 0;
    width: auto;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: 4px;
  }

  .error {
    color: var(--color-error);
    font-size: 0.85rem;
    margin-top: 4px;
  }

  .url-preview {
    margin-top: 8px;
    padding: 12px;
    background: var(--surface-glass);
    border-radius: 6px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.9rem;
    word-break: break-all;
  }

  .config-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .unsaved-changes {
    color: var(--color-warning);
    font-size: 0.9rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @media (max-width: 640px) {
    .config-container {
      flex-direction: column;
    }

    .config-nav {
      flex-direction: row;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      padding-right: 0;
      padding-bottom: 16px;
      min-width: auto;
      overflow-x: auto;
    }

    .config-nav button {
      flex-shrink: 0;
    }
  }
</style>