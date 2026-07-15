<script lang="ts">
    // Props
    export let color: string = 'currentColor';
    export let size: number = 24;
    export let strokeWidth: number = 2;
    export let infinite: boolean = false;
    export let className: string = '';
</script>

<div
	class={className}
	aria-label="clock"
	role="img"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={color}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="12" cy="12" r="10" />
		<line x1="12" y1="6" x2="12" y2="12" class="minute-hand {infinite ? 'infinite' : ''}" />
		<line x1="12" y1="12" x2="16" y2="14" class="hour-hand {infinite ? 'infinite' : ''}" />
	</svg>
</div>

<style>
	div {
		display: inline-block;
	}
	
	.minute-hand,
	.hour-hand {
		transform-origin: center;
	}
	
	.minute-hand.infinite {
		animation: rotate-minute 1s linear infinite;
	}
	
	.hour-hand.infinite {
		animation: rotate-hour 12s linear infinite;
	}
	
	@keyframes rotate-minute {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	@keyframes rotate-hour {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>