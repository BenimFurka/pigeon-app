// можно настроить здесь конфиги
const config = {
  server: {
    secure: false,
    host: 'localhost',
    port: 8080,
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

export const getServerUrl = () => {
  const protocol = config.server.secure ? 'https' : 'http';
  return `${protocol}://${config.server.host}:${config.server.port}`;
};

export const getWebSocketUrl = (): string => {
  const protocol = config.server.secure ? 'wss' : 'ws';
  return `${protocol}://${config.server.host}:${config.server.port}${config.server.apiPath}/${config.server.apiVer}/ws`;
};

export const getApiUrl = (endpoint = '') => {
  const baseUrl = getServerUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${config.server.apiPath}/${config.server.apiVer}${normalizedEndpoint}`;
};

export default config;
