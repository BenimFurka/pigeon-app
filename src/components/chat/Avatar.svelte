<script>
	import { avatars } from '../../stores/avatarStore.js';

	export let userId;
	export let size = 40;

	let avatarPromise = avatars.getAvatar(userId);

	$: if (userId) {
		avatarPromise = avatars.getAvatar(userId);
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
