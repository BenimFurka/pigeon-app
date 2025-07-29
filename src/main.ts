import App from './layouts/App.svelte';
import { refreshTokens } from './stores/auth';
import { avatars } from './stores/avatar';
import { profiles } from './stores/profile';

async function initApp() {
  await refreshTokens();
  
  await avatars.initializeCache();
  await profiles.initializeCache();

  return new App({ target: document.body });
}

const app = Promise.resolve(initApp());

export default app;