import { writable } from 'svelte/store';

const NEWS_ENABLED_KEY = 'news_enabled';
const READ_NEWS_KEY = 'read_news_ids';

// TODO: add settings
function getInitialNewsEnabled(): boolean {
	if (typeof window === 'undefined') return true;

	const saved = window.localStorage.getItem(NEWS_ENABLED_KEY);
	if (saved === 'true' || saved === 'false') return saved === 'true';

	return true;
}

function getReadNewsIds(): Set<number> {
	if (typeof window === 'undefined') return new Set();

	const saved = window.localStorage.getItem(READ_NEWS_KEY);
	if (saved) {
		try {
			const ids = JSON.parse(saved);
			return new Set(ids);
		} catch (e) {
			console.error('Failed to parse read news IDs:', e);
		}
	}

	return new Set();
}

function saveReadNewsIds(ids: Set<number>) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(READ_NEWS_KEY, JSON.stringify(Array.from(ids)));
}

function createNewsStore() {
	const { subscribe, set, update } = writable<boolean>(true);
	const readNewsIds = writable<Set<number>>(getReadNewsIds());

	if (typeof window !== 'undefined') {
		const initial = getInitialNewsEnabled();
		set(initial);
	}

	return {
		subscribe,
		set(enabled: boolean) {
			set(enabled);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(NEWS_ENABLED_KEY, enabled.toString());
			}
		},
		toggle() {
			update((current) => {
				const next = !current;
				if (typeof window !== 'undefined') {
					window.localStorage.setItem(NEWS_ENABLED_KEY, next.toString());
				}
				return next;
			});
		},
		markAsRead(newsId: number) {
			readNewsIds.update((ids) => {
				const newIds = new Set(ids);
				newIds.add(newsId);
				saveReadNewsIds(newIds);
				return newIds;
			});
		},
		isRead: (newsId: number) => {
			let isRead = false;
			readNewsIds.subscribe((ids) => {
				isRead = ids.has(newsId);
			})();
			return isRead;
		},
		readNewsIds
	};
}

export const newsEnabled = createNewsStore();
