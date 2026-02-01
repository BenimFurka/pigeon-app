import { makeRequest } from '$lib/api';
import type {
    ChatAttachment,
    GifAttachmentPayload,
    GifItem,
    GifListResponse,
    RecentGif,
    RecentGifsResponse
} from '$lib/types/models';

export interface GifSearchParams {
    query: string;
    limit?: number;
    offset?: number;
}

export interface GifListParams {
    limit?: number;
    offset?: number;
}

const DEFAULT_LIMIT = 20;

function resolvePaginationParams(params?: GifListParams) {
    return {
        limit: params?.limit ?? DEFAULT_LIMIT,
        offset: params?.offset ?? 0,
    };
}

function buildPaginationQuery(params?: GifListParams): string {
    const { limit, offset } = resolvePaginationParams(params);
    return `limit=${limit}&offset=${offset}`;
}

export async function searchGifs(params: GifSearchParams): Promise<GifListResponse> {
    const query = params.query.trim();
    const { limit, offset } = resolvePaginationParams(params);
    if (!query) {
        return {
            gifs: [],
            pagination: {
                total: 0,
                count: 0,
                limit,
                offset,
                has_more: false,
            },
        };
    }

    const pagination = `limit=${limit}&offset=${offset}`;
    const endpoint = `/gifs/search?q=${encodeURIComponent(query)}&${pagination}`;
    const res = await makeRequest<GifListResponse>(endpoint, null, true, 'GET');
    if (!res.data) {
        throw new Error('Не удалось получить результаты поиска GIF');
    }
    return res.data;
}

export async function getTrendingGifs(params?: GifListParams): Promise<GifListResponse> {
    const pagination = buildPaginationQuery(params);
    const endpoint = `/gifs/trending?${pagination}`;
    const res = await makeRequest<GifListResponse>(endpoint, null, true, 'GET');
    if (!res.data) {
        throw new Error('Не удалось получить популярные GIF');
    }
    return res.data;
}

export async function getRecentGifs(params?: GifListParams): Promise<RecentGifsResponse> {
    const pagination = buildPaginationQuery(params);
    const endpoint = `/gifs/recent?${pagination}`;
    const res = await makeRequest<RecentGifsResponse>(endpoint, null, true, 'GET');
    if (!res.data) {
        throw new Error('Не удалось получить недавние GIF');
    }
    return res.data;
}

export function recentGifToGifItem(recentGif: RecentGif): GifItem {
    return {
        id: recentGif.gif_id,
        title: recentGif.title,
        url: recentGif.url,
        preview_url: recentGif.preview_url,
        width: recentGif.width,
        height: recentGif.height,
        size: recentGif.size,
        source: recentGif.source,
        search_query: recentGif.search_query,
    };
}

export function recentGifToAttachmentPayload(recentGif: RecentGif): GifAttachmentPayload {
    return {
        id: recentGif.gif_id,
        title: recentGif.title,
        url: recentGif.url,
        preview_url: recentGif.preview_url,
        width: recentGif.width,
        height: recentGif.height,
        size: recentGif.size,
        source: recentGif.source,
        search_query: recentGif.search_query,
    };
}

export async function addRecentGif(payload: GifItem): Promise<void> {
    const requestData = {
        gif_id: payload.id,
        title: payload.title,
        url: payload.url,
        preview_url: payload.preview_url,
        width: payload.width,
        height: payload.height,
        size: payload.size,
        source: payload.source,
        search_query: payload.search_query,
    };
    
    await makeRequest('/gifs/recent', { data: requestData }, true, 'POST');
}

export async function createGifAttachment(chatId: number, payload: GifAttachmentPayload): Promise<ChatAttachment> {
    const res = await makeRequest<ChatAttachment>(`/chats/${chatId}/gifs`, { data: payload }, true, 'POST');
    if (!res.data) {
        throw new Error('Не удалось создать GIF-вложение');
    }
    return res.data;
}

export async function createGifAttachmentFromRecent(chatId: number, recentGif: RecentGif): Promise<ChatAttachment> {
    const payload = recentGifToAttachmentPayload(recentGif);
    const res = await makeRequest<ChatAttachment>(`/chats/${chatId}/gifs`, { data: payload }, true, 'POST');
    if (!res.data) {
        throw new Error('Не удалось создать GIF-вложение');
    }
    return res.data;
}

export function mapGifToAttachmentPayload(gif: GifItem): GifAttachmentPayload {
    const { id, title, url, preview_url, width, height, size, source, search_query } = gif;
    return {
        id,
        title,
        url,
        preview_url,
        width,
        height,
        size,
        source,
        search_query,
    };
}

export type GifLoader = (params?: GifListParams) => Promise<GifListResponse>;