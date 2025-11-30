<script lang="ts">
	import Input from '../components/ui/Input.svelte';
	import Bar from '../components/ui/Bar.svelte';
    import ChatList from '../components/chat/ChatList.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Chat } from '../types/models';

	// TODO: Use
	const dispatch = createEventDispatcher();
	
    export let onChatSelect: (chat: Chat) => void = () => {};

	let searchQuery = '';
	let selectedChatId: number | null = null;
	
	function handleChatSelect(chat: Chat) {
		selectedChatId = chat.id;
		onChatSelect(chat);
	}
</script>

<div class="left-layout" id="left-layout">
   <Bar>
    <Input 
		placeholder="Поиск..."
		style="width: 100%; margin: 10px; padding: 10px;"
		bind:value={searchQuery} />
   </Bar>
	<ChatList bind:selectedChatId onSelect={handleChatSelect} />
</div>

<style>
	.left-layout {
		display: flex;
		flex-direction: column;

		min-height: 0;
		height: 100%;
		width: 300px;
		
		margin-left: 40px;
		z-index: 0;
		overflow: hidden;

		background-image: 
			linear-gradient(var(--glass), var(--glass)),
			linear-gradient(var(--secondary-color), var(--secondary-color));
                
		transition: var(--transition);	
    }
</style>