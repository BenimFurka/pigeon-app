import App from './layouts/App.svelte';
import { avatars } from './stores/avatar';
import { profiles } from './stores/profile';
import { session } from './modules/session';

async function initApp() {
  try {
    await Promise.all([
      avatars.initializeCache(),
      profiles.initializeCache()
    ]);

    await session.initialize();

    return new App({ target: document.body });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    return new App({ target: document.body });
  }
}

const app = initApp();

export default app;
