import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
	if (typeof window === 'undefined') return 'dark';

	const saved = window.localStorage.getItem('theme');
	if (saved === 'light' || saved === 'dark') return saved;

	return 'dark';
}

function applyTheme(theme: Theme) {
	if (typeof document === 'undefined') return;

	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>('dark');

	if (typeof window !== 'undefined') {
		const initial = getInitialTheme();
		set(initial);
		applyTheme(initial);
	}

	return {
		subscribe,
		set(theme: Theme) {
			set(theme);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('theme', theme);
				applyTheme(theme);
			}
		},
		toggle() {
			update((current) => {
				const next: Theme = current === 'dark' ? 'light' : 'dark';
				if (typeof window !== 'undefined') {
					window.localStorage.setItem('theme', next);
					applyTheme(next);
				}
				return next;
			});
		}
	};
}

export const theme = createThemeStore();


