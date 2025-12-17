<script lang="ts">
    import { onMount } from 'svelte';
    import { useAvatar } from '../../queries/avatar';

    export let avatarUrl: string | null = null;
    export let size: number | 'small' | 'medium' | 'large' | 'xlarge' = 40;
    export let className: string = '';

    const fallbackImage: string = './assets/image/default.png';
    
    let isVisible = false;
    let container: HTMLDivElement;
    let imageError = false;

    const avatarSource = avatarUrl;
    $: resolvedSize = typeof size === 'number'
        ? size
        : size === 'small'
            ? 32
            : size === 'medium'
                ? 44
                : size === 'large'
                    ? 60
                    : 90;

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

    type AvatarQuery = ReturnType<typeof useAvatar>;
    let avatarQuery: AvatarQuery | null = null;
    let avatarData: any = null;
    $: avatarQuery = isVisible && avatarSource ? useAvatar(avatarSource) : null;
    $: avatarData = avatarQuery ? $avatarQuery : null;
    
    $: if (avatarData) {
        if (avatarData.data) {
            imageError = false;
        } else if (avatarData.isError) {
            console.error('Error loading avatar:', avatarData.error);
            imageError = true;
        }
    }
    function handleImageError() {
        imageError = true;
    }
</script>

<div 
    bind:this={container} 
    class={className}
    style="width: {resolvedSize}px; height: {resolvedSize}px;"
>
    {#if isVisible && avatarData?.data && !imageError}
        <img 
            src={avatarData.data} 
            alt="" 
            class="avatar"
            on:error={handleImageError}
            style="width: 100%; height: 100%;"
        />
    {:else}
        <img 
            src={fallbackImage} 
            alt="" 
            class="avatar fallback"
            style="width: 100%; height: 100%;"
        />
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
		background-color: var(--glass);
	}
 
	.avatar-container { 
		object-fit: cover;
		position: relative; 
		overflow: hidden;
        -moz-user-select: none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        user-select: none;
	}
</style>
