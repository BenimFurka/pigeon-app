import { writable, get, type Writable } from 'svelte/store';

const initialConfig = {
  server: {
    secure: false,
    host: window.location.hostname,
    port: 8443,
    apiPath: '/api',
    apiVer: 'v1'
  },
  
  websocket: {
    reconnectDelay: 3000,
  },
  
  app: {
    defaultLanguage: 'en',
    version: '1.0.0'
  }
};

export const config: Writable<typeof initialConfig> = writable(initialConfig);

const STORAGE_KEY = 'app-config';

export function loadConfigFromStorage(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      config.set({ ...initialConfig, ...parsed });
    }
  } catch (error) {
    console.warn('Failed to load config from storage:', error);
  }
}

export function saveConfigToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get(config)));
  } catch (error) {
    console.warn('Failed to save config to storage:', error);
  }
}

export function resetConfig(): void {
  config.set(initialConfig);
  localStorage.removeItem(STORAGE_KEY);
}

export const getServerUrl = () => {
  const currentConfig = get(config);
  const protocol = currentConfig.server.secure ? 'https' : 'http';
  return `${protocol}://${currentConfig.server.host}:${currentConfig.server.port}`;
};

export const getWebSocketUrl = (): string => {
  const currentConfig = get(config);
  const protocol = currentConfig.server.secure ? 'wss' : 'ws';
  return `${protocol}://${currentConfig.server.host}:${currentConfig.server.port}${currentConfig.server.apiPath}/${currentConfig.server.apiVer}/ws`;
};

export const getApiUrl = (endpoint = '') => {
  const baseUrl = getServerUrl();
  const currentConfig = get(config);
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${currentConfig.server.apiPath}/${currentConfig.server.apiVer}${normalizedEndpoint}`;
};

if (typeof window !== 'undefined') {
  loadConfigFromStorage();
}

export default {
  subscribe: config.subscribe,
  set: config.set,
  update: config.update
};