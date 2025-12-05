import { createQuery } from '@tanstack/svelte-query';
import { derived, type Readable } from 'svelte/store';
import { makeRequest } from '../lib/api';
import type { Chat, Message, UserPublic } from '../types/models';

export interface SearchResults {
  users: UserPublic[];
  chats: Chat[];
  messages: Array<{
    message: Message;
    chat: Chat;
    sender: UserPublic;
  }>;
}

export interface UseSearchOptions {
  enabled?: boolean;
  scope?: string;
  limit?: number;
}

export const searchKeys = {
  all: ['search'] as const,
  params: (term: string, scope: string, limit?: number) =>
    ['search', term, scope, limit ?? 'default'] as const,
};

const emptyResults: SearchResults = { users: [], chats: [], messages: [] };

export function useSearch(termStore: Readable<string>, options?: UseSearchOptions) {
  const scope = options?.scope ?? 'users,chats,messages';
  const limit = options?.limit;

  const queryOptions = derived(termStore, (rawTerm) => {
    const term = rawTerm.trim();
    const enabled = (options?.enabled ?? true) && term.length >= 2;

    return {
      queryKey: searchKeys.params(term || '', scope, limit),
      enabled,
      placeholderData: emptyResults,
      queryFn: async (): Promise<SearchResults> => {
        const limitParam = typeof limit === 'number' ? `&limit=${limit}` : '';
        const endpoint = `/search?q=${encodeURIComponent(term)}&scope=${encodeURIComponent(scope)}${limitParam}`;
        const res = await makeRequest<SearchResults>(endpoint, null, true, 'GET');
        if (!res.data) {
          return emptyResults;
        }
        return res.data;
      },
      gcTime: 2 * 60_000,
      staleTime: 30_000,
    };
  });

  return createQuery(queryOptions);
}
