import { writable } from 'svelte/store';

const STORAGE_KEY = 'pigeon_accent_hue';
export const DEFAULT_HUE = 235;

function loadHue(): number {
	if (typeof window === 'undefined') return DEFAULT_HUE;
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (raw == null) return DEFAULT_HUE;
	const n = Number(raw);
	if (Number.isNaN(n)) return DEFAULT_HUE;
	return Math.max(0, Math.min(360, Math.round(n)));
}

function applyHue(hue: number) {
	if (typeof document === 'undefined') return;
	document.documentElement.style.setProperty('--hue', String(hue));
}

function createAccentStore() {
	const initial = loadHue();
	const { subscribe, set } = writable<number>(initial);

	if (typeof window !== 'undefined') {
		applyHue(initial);
	}

	return {
		subscribe,
		set(hue: number) {
			const clamped = Math.max(0, Math.min(360, Math.round(hue)));
			set(clamped);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(STORAGE_KEY, String(clamped));
				applyHue(clamped);
			}
		},
		reset() {
			this.set(DEFAULT_HUE);
		}
	};
}

export const accentHue = createAccentStore();
