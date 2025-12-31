import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { makeRequest } from '../lib/api';
import type { Chat, ChatPreview } from '../types/models';
import { presence } from '../stores/presence';
import { get } from 'svelte/store';

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
      
      for (const data of res.data) {
        if (data.other_user?.last_seen_at) {
          const currentPresence = get(presence)[data.other_user.id];
        
          if (currentPresence?.online) {
            presence.setOnline(data.other_user.id, data.other_user.last_seen_at);
          } else {
            presence.setOffline(data.other_user.id, data.other_user.last_seen_at);
          }
        }
        
      }
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    ...options,
  });
}

export function useJoinPublicChat() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: async (chatId: number): Promise<Chat> => {
      const res = await makeRequest<Chat>(`/chats/${chatId}/join`, null, true, 'POST');
      if (!res.data) throw new Error('Не удалось присоединиться к чату');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.previews() });
      queryClient.setQueryData(chatKeys.detail(data.id), data);
    },
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