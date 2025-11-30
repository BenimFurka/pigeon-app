import { createQuery } from '@tanstack/svelte-query';
import { makeRequest } from '../lib/api';
import type { Message } from '../types/models';

export const messageKeys = {
  all: ['messages'] as const,
  list: (chatId: number) => [...messageKeys.all, chatId] as const,
};

export function useMessages(chatId: number, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: messageKeys.list(chatId),
    queryFn: async (): Promise<Message[]> => {
      const res = await makeRequest<Message[]>(`/chats/${chatId}/messages`, null, true, 'GET');
      if (!res.data) throw new Error('No messages in response');
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}
