import { createQuery } from '@tanstack/svelte-query';
import { get } from 'svelte/store';
import { makeRequest } from '$lib/api';
import { reactions } from '$lib/stores/reactions';
import { loggedIn } from '$lib/stores/auth';
import { storePollFromMessage } from '$lib/queries/polls';
import { profileKeys } from './profile';
import type { Message } from '$lib/types/models';
import { queryClient } from '$lib/query';

export type GetMessagesParams = {
  limit?: number;
  before_id?: number;
  after_id?: number;
};

export const messageKeys = {
  all: ['messages'] as const,
  list: (chatId: number) => [...messageKeys.all, chatId] as const,
};

function buildQueryString(params?: GetMessagesParams): string {
  if (!params) return '';

  const search = new URLSearchParams();
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.before_id === 'number') search.set('before_id', String(params.before_id));
  if (typeof params.after_id === 'number') search.set('after_id', String(params.after_id));

  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function getCurrentUserId(): number | null {
  const profileData = queryClient.getQueryData(profileKeys.current()) as any;
  return profileData?.id || null;
}

export async function fetchMessages(chatId: number, params?: GetMessagesParams): Promise<Message[]> {
  const res = await makeRequest<Message[]>(
    `/chats/${chatId}/messages${buildQueryString(params)}`,
    null,
    true,
    'GET'
  );
  if (!res.data) throw new Error('No messages in response');
  
  const reactionsStore = get(reactions);
  const newReactionsState = { ...reactionsStore };
  const currentUserId = getCurrentUserId();
  
  res.data.forEach(message => {
    if (message.reactions && message.reactions.length > 0) {
      newReactionsState[message.id] = message.reactions;
    } else {
      delete newReactionsState[message.id];
    }
    
    if (message.media && message.media.length > 0) {
      const pollMedia = message.media.find(m => m.type === 'Poll');
      if (pollMedia) {
        storePollFromMessage(message, currentUserId);
      }
    }
  });
  
  reactions.set(newReactionsState);
  
  return res.data;
}

export function useMessages(
  chatId: number,
  options?: { enabled?: boolean; params?: GetMessagesParams }
) {
  return createQuery({
    queryKey: messageKeys.list(chatId),
    queryFn: async (): Promise<Message[]> => {
      return fetchMessages(chatId, options?.params);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: (options?.enabled !== false) && get(loggedIn),
  });
}
