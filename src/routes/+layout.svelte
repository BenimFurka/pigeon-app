<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { onDestroy } from 'svelte';
  import { get, type Unsubscriber } from 'svelte/store';

  import { queryClient } from '$lib/query';
  import config from '$lib/config';
  import { changeLocale, setupI18n } from '$lib/i18n';
  import { assets } from '$app/paths';

  const initialLocale = get(config)?.app?.defaultLanguage;
  setupI18n(initialLocale);

  const unsubscribe: Unsubscriber = config.subscribe(($config) => {
    const desiredLocale = $config?.app?.defaultLanguage;
    if (desiredLocale) {
      changeLocale(desiredLocale);
    }
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
</QueryClientProvider>