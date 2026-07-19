<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { onDestroy, onMount } from 'svelte';
  import { get, type Unsubscriber } from 'svelte/store';

  import { queryClient } from '$lib/query';
  import config from '$lib/config';
  import { changeLocale, setupI18n } from '$lib/i18n';
  import { assets } from '$app/paths';
  import '../styles/index.scss';
  import { loggedIn } from '$lib/stores/auth';
  import { newsEnabled } from '$lib/stores/news';
  import { getNewsForUser } from '$lib/api';
  import NewsModal from '$lib/components/forms/modals/NewsModal.svelte';

  const initialLocale = get(config)?.app?.defaultLanguage;
  setupI18n(initialLocale);

  const unsubscribe: Unsubscriber = config.subscribe(($config) => {
    const desiredLocale = $config?.app?.defaultLanguage;
    if (desiredLocale) {
      changeLocale(desiredLocale);
    }
  });

  let showNewsModal = false;
  let currentNews: import('$lib/types/models').News | null = null;

  async function checkForNews() {
    try {
      const enabled = get(newsEnabled);
      const response = await getNewsForUser();
      if (response.data && !response.data.is_read && enabled) {
        currentNews = response.data.news;
        showNewsModal = true;
      }
    } catch (e) {
      console.error('Failed to check for news:', e);
    }
  }

  onMount(() => {
    const unsubscribeAuth = loggedIn.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        checkForNews();
      }
    });

    return () => {
      unsubscribeAuth?.();
    };
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>


<svelte:head>
<link rel="icon" href={`${assets}/favicon.png`} />
<link rel="stylesheet" href={`${assets}/global.css`} />
</svelte:head>
 
<QueryClientProvider client={queryClient}>
    <slot />
    {#if currentNews}
      <NewsModal 
        isOpen={showNewsModal} 
        news={currentNews} 
        on:close={() => showNewsModal = false} 
      />
    {/if}
</QueryClientProvider>
