import { createInfiniteQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { derived, writable, type Readable } from 'svelte/store';
import {
    searchGifs,
    getTrendingGifs,
    getRecentGifs,
    addRecentGif,
    createGifAttachment,
    createGifAttachmentFromRecent,
    mapGifToAttachmentPayload,
    recentGifToGifItem,
    type GifListParams,
} from '$lib/gifs';
import type { ChatAttachment, GifItem, RecentGif, RecentGifsResponse } from '$lib/types/models';

export const gifKeys = {
    all: ['gifs'] as const,
    trending: (limit: number) => [...gifKeys.all, 'trending', limit] as const,
    recent: (limit: number) => [...gifKeys.all, 'recent', limit] as const,
    search: (term: string, limit: number) => [...gifKeys.all, 'search', term, limit] as const,
};

export interface GifInfiniteQueryOptions extends GifListParams {
    enabled?: boolean;
}

function getNextPageParam(lastPageCount: number, lastOffset: number): number | undefined {
    if (lastPageCount === 0) return undefined;
    return lastOffset + lastPageCount;
}

export function useTrendingGifsQuery(options?: GifInfiniteQueryOptions) {
    const limit = options?.limit ?? 24;
    const enabled = options?.enabled ?? true;

    return createInfiniteQuery({
        initialPageParam: options?.offset ?? 0,
        queryKey: gifKeys.trending(limit),
        enabled,
        queryFn: async ({ pageParam }) => getTrendingGifs({ limit, offset: pageParam }),
        getNextPageParam: (lastPage) =>
            lastPage.pagination?.has_more
                ? getNextPageParam(lastPage.pagination.count, lastPage.pagination.offset)
                : undefined,
    });
}

export function useRecentGifsQuery(options?: GifInfiniteQueryOptions) {
    const limit = options?.limit ?? 24;
    const enabled = options?.enabled ?? true;

    return createInfiniteQuery({
        initialPageParam: options?.offset ?? 0,
        queryKey: gifKeys.recent(limit),
        enabled,
        queryFn: async ({ pageParam }) => getRecentGifs({ limit, offset: pageParam }),
        getNextPageParam: (lastPage: RecentGifsResponse) =>
            lastPage.pagination?.has_more
                ? getNextPageParam(lastPage.pagination.count, lastPage.pagination.offset)
                : undefined,
    });
}

export function recentGifsToGifList(recentResponse: RecentGifsResponse): { gifs: GifItem[]; pagination: any } {
    return {
        gifs: recentResponse.gifs.map(recentGifToGifItem),
        pagination: recentResponse.pagination,
    };
}

export interface SearchGifOptions extends Omit<GifInfiniteQueryOptions, 'enabled'> {
    enabled?: Readable<boolean>;
    minTermLength?: number;
}

export function useSearchGifsQuery(termStore: Readable<string>, options?: SearchGifOptions) {
    const limit = options?.limit ?? 24;
    const minTermLength = options?.minTermLength ?? 2;
    const enabledStore = options?.enabled || writable(true);

    const queryOptions = derived([termStore, enabledStore], ([$term, $enabled]) => {
        const term = $term?.trim() ?? '';
        const enabled = $enabled && term.length >= minTermLength;

        return {
            initialPageParam: options?.offset ?? 0,
            queryKey: gifKeys.search(term, limit),
            enabled,
            queryFn: async ({ pageParam }: { pageParam: number }) =>
                searchGifs({ query: term, limit, offset: pageParam }),
            getNextPageParam: (lastPage: Awaited<ReturnType<typeof searchGifs>>) =>
                lastPage.pagination?.has_more
                    ? getNextPageParam(lastPage.pagination.count, lastPage.pagination.offset)
                    : undefined,
        };
    });

    return createInfiniteQuery(queryOptions);
}

export function useSendGifMutation(chatId: number) {
    const queryClient = useQueryClient();

    return createMutation({
        mutationFn: async (payload: GifItem | RecentGif): Promise<ChatAttachment> => {
            const isRecentGif = 'gif_id' in payload;
            
            if (isRecentGif) {
                const recentGif = payload as RecentGif;
                
                const attachment = await createGifAttachmentFromRecent(chatId, recentGif);
                
                await addRecentGif(recentGifToGifItem(recentGif));
                
                return attachment;
            } else {
                const gifItem = payload as GifItem;
                const gifPayload = mapGifToAttachmentPayload(gifItem);
                
                const attachment = await createGifAttachment(chatId, gifPayload);
                
                await addRecentGif(gifItem);
                
                return attachment;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: gifKeys.all });
        },
    });
}

export function useMarkGifRecentMutation() {
    return createMutation({
        mutationFn: async (payload: GifItem | RecentGif) => {
            if ('gif_id' in payload) {
                const recentGif = payload as RecentGif;
                return addRecentGif(recentGifToGifItem(recentGif));
            } else {
                const gifItem = payload as GifItem;
                return addRecentGif(gifItem);
            }
        },
    });
}