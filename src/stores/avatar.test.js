import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { avatars } from './avatar.js';

vi.mock('../config.js', () => ({
	getApiUrl: (endpoint) => `http://localhost:8080/api/${endpoint}`,
}));

describe('avatars store', () => {
	const userId = '123';
	let mockCache;

	beforeEach(() => {
		
		vi.clearAllMocks();

		mockCache = {
			match: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			keys: vi.fn().mockResolvedValue([]),
		};
		caches.open.mockResolvedValue(mockCache);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should fetch a new avatar', async () => {
		const mockBlob = new Blob(['mock-avatar-data'], { type: 'image/png' });
		const mockEtag = '"new-hash"';

		mockCache.match.mockResolvedValue(null);
		fetch.mockResolvedValue(new Response(mockBlob, {
			status: 200,
			headers: { 'ETag': mockEtag },
		}));

		const avatarData = await avatars.getAvatar(userId);

		expect(avatarData).toBe('data:image/png;base64,mock-data-url');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(mockCache.put).toHaveBeenCalledTimes(1);
		expect(get(avatars)[userId]).toBe(avatarData);
	});

	it('should return cached avatar with 304', async () => {
		const initialBlob = new Blob(['initial-avatar-data'], { type: 'image/png' });
		const initialEtag = '"initial-hash"';
		const initialResponse = new Response(initialBlob, { headers: { 'ETag': initialEtag } });

		mockCache.match.mockResolvedValue(initialResponse);
		fetch.mockResolvedValue(new Response(null, { status: 304 }));

		const avatarData = await avatars.getAvatar(userId);

		expect(avatarData).toBe('data:image/png;base64,mock-data-url');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ headers: { 'If-None-Match': initialEtag } })
		);
		expect(mockCache.put).not.toHaveBeenCalled();
	});

	it('should return null on network error', async () => {
		mockCache.match.mockResolvedValue(null);
		fetch.mockRejectedValue(new Error('Network failure'));

		const avatarData = await avatars.getAvatar(userId);

		expect(avatarData).toBeNull();
	});

	it('should return null', async () => {
		mockCache.match.mockResolvedValue(null);
		fetch.mockResolvedValue(new Response('Server error', { status: 500 }));

		const avatarData = await avatars.getAvatar(userId);

		expect(avatarData).toBeNull();
	});
});
