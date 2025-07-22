<script lang="ts">
	import { avatars } from '../../stores/avatar';

	export let id: number;
	export let size: number = 40;

	let avatarPromise: Promise<string | null> = avatars.getAvatar(id);

	$: if (id) {
		avatarPromise = avatars.getAvatar(id);
	}
</script>

<div class="avatar-container" style="width: {size}px; height: {size}px;">
	{#await avatarPromise}
		<img src="/assets/image/default.png" alt="" class="avatar" />
	{:then avatarUrl}
		{#if avatarUrl}
			<img src={avatarUrl} alt="" class="avatar" />
		{:else}
			<img src="/assets/image/default.png" alt="" class="avatar" />
		{/if}
	{/await}
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
