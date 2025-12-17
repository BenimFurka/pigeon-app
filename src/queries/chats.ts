import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { makeRequest } from '../lib/api';
import type { Chat, ChatPreview } from '../types/models';

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  previews: () => [...chatKeys.lists(), 'previews'] as const,
  detail: (id: number) => [...chatKeys.all, 'detail', id] as const,
};

export function useChats(options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: chatKeys.previews(),
    queryFn: async (): Promise<ChatPreview[]> => {
      const res = await makeRequest<ChatPreview[]>('/chats', null, true, 'GET');
      if (!res.data) throw new Error('No chats in response');
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

export function useChat(chatId: number, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: async (): Promise<Chat> => {
      const res = await makeRequest<Chat>(`/chats/${chatId}`, null, true, 'GET');
      if (!res.data) throw new Error('Chat not found');
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
    }): Promise<ChatPreview> => {
      const res = await makeRequest<ChatPreview>('/chats', { data: payload }, true, 'POST');
      if (!res.data) throw new Error('Failed to create chat');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
      queryClient.setQueryData(chatKeys.detail(data.id), data);
    },
  });
}