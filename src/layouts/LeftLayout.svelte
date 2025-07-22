<script lang="ts">
	import Button from '../components/ui/Button.svelte';
	import Input from '../components/ui/Input.svelte';
	import Bar from '../components/ui/Bar.svelte';
	import ChatsList from '../ChatsList.svelte';
    import ChatList from '../components/chat/ChatList.svelte';

	export let searchQuery = '';
	// TODO: Сделать
	//  export let onChatSelect = (id) => {};
	//  export let onSearch = (value) => {};

</script>

<div class="left-layout" id="left-layout">
   <Bar>
    <Button 
		text="⚙️" 
		style="background: none; min-width: 30px; width: 30px;"
		onClick={() => {
			// TODO: послать реализацию настроек в задницу
			console.log('типа в настройках')
		}}
	/>
    <Input 
		placeholder="Поиск..."
		style="width: 100%; margin: 10px; padding: 10px;"
		bind:value={searchQuery} />
   </Bar>
	<ChatList></ChatList>
</div>

<style>
	.left-layout {
		display: flex;
		flex-direction: column;

		min-height: 0;
		height: 100%;
		
		z-index: 1;
		overflow: hidden;
	}
/* TODO: перенести
	.list {
		height: calc(100vh - 100px);
		overflow-y: auto;
	}
*/
</style>