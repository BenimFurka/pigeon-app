<script lang="ts">
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { queryClient } from '$lib/query';
</script>


<svelte:head>
	<link rel="icon" href="/favicon.png" />
	<link rel="stylesheet" href="/global.css" />
</svelte:head>
 
<QueryClientProvider client={queryClient}>
    <slot />
</QueryClientProvider>
