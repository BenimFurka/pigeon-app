const config = {
  server: {
    secure: false,
    host: 'localhost',
    port: 8080,
    apiPath: '/api'
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

export const getWebSocketUrl = (endpoint = '') => {
  const protocol = config.server.secure ? 'wss' : 'ws';
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${protocol}://${config.server.host}:${config.server.port}${normalizedEndpoint}`;
};

export const getApiUrl = (endpoint = '') => {
  const baseUrl = getServerUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${config.server.apiPath}${normalizedEndpoint}`;
};

export default config;
