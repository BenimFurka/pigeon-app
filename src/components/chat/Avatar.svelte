<script lang="ts">
    import { onMount } from 'svelte';
    import { useAvatar } from '../../queries/avatar';

    export let id: number;
    export let size: number = 40;

    let avatarUrl: string | null = null;
    let isVisible = false;
    let container: HTMLDivElement;

    onMount(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    isVisible = true;
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(container);
        return () => observer.disconnect();
    });

    $: avatarQuery = isVisible && id ? useAvatar(id) : null
    $: if (avatarQuery && $avatarQuery?.data) {
        avatarUrl = $avatarQuery.data;
    }
</script>

<div bind:this={container} class="avatar-container" style="width: {size}px; height: {size}px;">
    {#if isVisible && avatarUrl}
        <img src={avatarUrl} alt="" class="avatar" />
    {:else if isVisible }
        <img src="./assets/image/default.png" alt="" class="avatar"/>
    {/if}
</div>

<style>
	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: inline-block;
		vertical-align: middle;
		display: flex;
		outline: none;
		border: none;
		flex-shrink: 0;
		background-color: var(--glass-color);
	}

	.avatar-container { 
		object-fit: cover;
		position: relative; 
		overflow: hidden;
	}
</style>
