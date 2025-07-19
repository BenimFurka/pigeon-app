import { vi } from 'vitest';

const mockCache = {
	match: vi.fn(),
	put: vi.fn(),
	keys: vi.fn().mockResolvedValue([]),
	delete: vi.fn(),
};

global.caches = {
	open: vi.fn().mockResolvedValue(mockCache),
};

global.fetch = vi.fn();

global.FileReader = class {
	constructor() {
		this.onloadend = null;
		this.onerror = null;
	}
	readAsDataURL(blob) {
		if (this.onloadend) {
			setTimeout(() => {
				this.onloadend({ target: { result: 'data:image/png;base64,mock-data-url' } });
			}, 0);
		}
	}
};
