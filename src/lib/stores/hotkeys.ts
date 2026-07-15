import { writable, get } from 'svelte/store';

export type HotkeyAction =
	| 'edit_last_message'
	| 'toggle_settings'
	| 'focus_message_input'
	| 'cancel_reply_or_edit';

export type HotkeyBinding = {
	key: string;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	meta?: boolean;
};

export type HotkeyConfig = Record<HotkeyAction, HotkeyBinding>;

const STORAGE_KEY = 'pigeon_hotkeys';

export const DEFAULT_HOTKEYS: HotkeyConfig = {
	edit_last_message: { key: 'ArrowUp' },
	toggle_settings: { key: '`', ctrl: true },
	focus_message_input: { key: 'Escape' },
	cancel_reply_or_edit: { key: 'Escape' }
};

function loadHotkeys(): HotkeyConfig {
	if (typeof window === 'undefined') return { ...DEFAULT_HOTKEYS };
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_HOTKEYS };
		const parsed = JSON.parse(raw) as Partial<HotkeyConfig>;
		return { ...DEFAULT_HOTKEYS, ...parsed };
	} catch {
		return { ...DEFAULT_HOTKEYS };
	}
}

function saveHotkeys(config: HotkeyConfig) {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function createHotkeysStore() {
	const { subscribe, set, update } = writable<HotkeyConfig>(loadHotkeys());

	return {
		subscribe,
		set(config: HotkeyConfig) {
			set(config);
			saveHotkeys(config);
		},
		updateBinding(action: HotkeyAction, binding: HotkeyBinding) {
			update((current) => {
				const next = { ...current, [action]: binding };
				saveHotkeys(next);
				return next;
			});
		},
		reset() {
			const defaults = { ...DEFAULT_HOTKEYS };
			set(defaults);
			saveHotkeys(defaults);
		}
	};
}

export const hotkeys = createHotkeysStore();

export const pendingEditMessageId = writable<number | null>(null);

export function matchesHotkey(event: KeyboardEvent, binding: HotkeyBinding): boolean {
	if (!binding?.key) return false;

	const key = event.key.length === 1 ? event.key : event.key;
	const bindingKey = binding.key;

	const keyMatches =
		key === bindingKey ||
		event.code === bindingKey ||
		(bindingKey === '`' && (event.code === 'Backquote' || key === '`')) ||
		key.toLowerCase() === bindingKey.toLowerCase();

	if (!keyMatches) return false;

	const wantCtrl = Boolean(binding.ctrl);
	const wantAlt = Boolean(binding.alt);
	const wantShift = Boolean(binding.shift);
	const wantMeta = Boolean(binding.meta);

	const ctrlOrMeta = event.ctrlKey || event.metaKey;
	if (wantCtrl || wantMeta) {
		if (!ctrlOrMeta) return false;
	} else if (event.ctrlKey || event.metaKey) {
		return false;
	}

	if (wantAlt !== event.altKey) return false;
	if (wantShift !== event.shiftKey) return false;

	return true;
}

export function formatHotkey(binding: HotkeyBinding): string {
	const parts: string[] = [];
	if (binding.ctrl) parts.push('Ctrl');
	if (binding.alt) parts.push('Alt');
	if (binding.shift) parts.push('Shift');
	if (binding.meta) parts.push('Meta');
	parts.push(binding.key === ' ' ? 'Space' : binding.key);
	return parts.join('+');
}

export function bindingFromEvent(event: KeyboardEvent): HotkeyBinding | null {
	if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return null;

	return {
		key: event.key,
		ctrl: event.ctrlKey || undefined,
		alt: event.altKey || undefined,
		shift: event.shiftKey || undefined,
		meta: event.metaKey || undefined
	};
}

export function getHotkey(action: HotkeyAction): HotkeyBinding {
	return get(hotkeys)[action] ?? DEFAULT_HOTKEYS[action];
}
