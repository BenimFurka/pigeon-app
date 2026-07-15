import { writable, derived } from 'svelte/store';
import { wsService, type ConnectionStatus } from '$lib/ws-service';

function createConnectionStore() {
	const { subscribe, set } = writable<ConnectionStatus>(wsService.getStatus());

	let unsub: (() => void) | null = null;
	let onlineUnsub: (() => void) | null = null;
	let offlineUnsub: (() => void) | null = null;

	function init() {
		if (typeof window === 'undefined') return;
		if (unsub) return;

		unsub = wsService.onStatus((status) => {
			set(status);
		});

		const syncBrowserOnline = () => {
			if (!navigator.onLine) {
				set('disconnected');
			} else {
				set(wsService.getStatus());
			}
		};

		window.addEventListener('online', syncBrowserOnline);
		window.addEventListener('offline', syncBrowserOnline);
		onlineUnsub = () => window.removeEventListener('online', syncBrowserOnline);
		offlineUnsub = () => window.removeEventListener('offline', syncBrowserOnline);

		if (!navigator.onLine) {
			set('disconnected');
		}
	}

	if (typeof window !== 'undefined') {
		init();
	}

	return {
		subscribe,
		init,
		getStatus(): ConnectionStatus {
			return wsService.getStatus();
		}
	};
}

export const connectionStatus = createConnectionStore();

export const isOnline = derived(connectionStatus, ($status) => $status === 'connected');

export const connectionLabelKey = derived(connectionStatus, ($status) => {
	switch ($status) {
		case 'connected':
			return 'connection.connected';
		case 'connecting':
			return 'connection.connecting';
		case 'error':
			return 'connection.error';
		case 'disconnected':
		default:
			return 'connection.disconnected';
	}
});
