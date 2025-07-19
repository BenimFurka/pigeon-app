<script>
  import Button from '../components/ui/Button.svelte';
  import Input from '../components/ui/Input.svelte';
  import Bar from '../components/ui/Bar.svelte';
// TODO: Сделать
//  import ChatsList from '../ChatsList.svelte';

  export let searchQuery = '';

  export let onChatSelect = (id) => {};
  export let onSearch = (value) => {};

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
</div>

<style>
	.left-layout, .right-layout {
		display: flex;
		flex-direction: column;

		min-height: 0;
		height: 100%;
		
		z-index: 1;
		overflow: hidden;
	}

	.list {
		height: calc(100vh - 100px);
		overflow-y: auto;
	}
</style>