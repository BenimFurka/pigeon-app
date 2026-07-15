<script lang="ts">
    import { onMount } from 'svelte';
    import { useAvatar } from '$lib/queries/avatar';
    import { assets } from '$app/paths';

    // Props
    export let avatarUrl: string | null = null;
    export let size: number | 'small' | 'medium' | 'large' | 'xlarge' = 40;
    export let className: string = '';

    // Constants
    const fallbackImage: string = `${assets}/assets/image/default.png`;

    // State
    let isVisible = false;
    let container: HTMLDivElement;
    let imageError = false;
    let avatarQuery: ReturnType<typeof useAvatar> | null = null;
    let avatarData: any = null;

    // Computed values
    $: currentAvatarUrl = avatarUrl;
    $: resolvedSize = typeof size === 'number'
        ? size
        : size === 'small'
            ? 32
            : size === 'medium'
                ? 44
                : size === 'large'
                    ? 60
                    : 90;
    $: avatarQuery = isVisible && currentAvatarUrl ? useAvatar(currentAvatarUrl) : null;
    $: avatarData = avatarQuery ? $avatarQuery : null;

    // Reactive statements
    $: {
        if (currentAvatarUrl) {
            imageError = false;
        }
        
        if (avatarData) {
            if (avatarData.data) {
                imageError = false;
            } else if (avatarData.isError) {
                console.error('Error loading avatar:', avatarData.error);
                imageError = true;
            }
        }
    }

    // Event handlers
    function handleImageError() {
        imageError = true;
    }

    // Lifecycle hooks
    onMount(() => {
        const rect = container.getBoundingClientRect();
        const isAlreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isAlreadyVisible) {
            isVisible = true;
            return;
        }

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
</script>

<div 
    bind:this={container} 
    class="avatar-container {className}"
    style="width: {resolvedSize}px; height: {resolvedSize}px;"
>
    {#if isVisible && avatarData?.data && !imageError}
        <img 
            src={avatarData.data} 
            alt="" 
            class="avatar"
            on:error={handleImageError}
        />
    {:else}
        <img 
            src={fallbackImage} 
            alt="" 
            class="avatar fallback"
        />
    {/if}
</div>

<style>
	.avatar-container { 
		--avatar-radius: 22.7%;
		position: relative; 
		overflow: hidden;
		border-radius: var(--avatar-radius);
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
	}

	.avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--avatar-radius);
		display: block;
		outline: none;
		border: none;
		flex-shrink: 0;
		background-color: transparent;
	}
</style>