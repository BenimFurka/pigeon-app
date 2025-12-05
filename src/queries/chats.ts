import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { makeRequest } from '../lib/api';
import type { Chat } from '../types/models';

export const chatKeys = {
  all: ['chats'] as const,
};

export function useChats(options?: { enabled?: boolean }) {
  return createQuery({ 
    queryKey: chatKeys.all,
    queryFn: async (): Promise<Chat[]> => {
      const res = await makeRequest<Chat[]>('/chats', null, true, 'GET');
      if (!res.data) throw new Error('No chats in response');
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: async (payload: {
      chat_type: string;
      name?: string;
      description?: string;
      is_public: boolean;
      member_ids: number[];
    }): Promise<Chat> => {
      const res = await makeRequest<Chat>('/chats', { data: payload }, true, 'POST');
      if (!res.data) throw new Error('Failed to create chat');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}