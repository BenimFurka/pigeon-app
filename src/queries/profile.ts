import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { get } from 'svelte/store';
import { makeRequest } from '../lib/api';
import { presence } from '../stores/presence';
import type { UserPublic } from '../types/models';

export type Profile = UserPublic;

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: string) => [...profileKeys.lists(), { filters }] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: number) => [...profileKeys.details(), id] as const,
  current: () => [...profileKeys.all, 'current'] as const,
};

export function useProfile(id: number, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: profileKeys.detail(id),
    queryFn: async (): Promise<Profile> => {
      const req = await makeRequest<Profile>(`users/${id}`, null, true, 'GET');
      if (!req.data) throw new Error('No profile data in response');
      
      if (req.data.last_seen_at) {
        const currentPresence = get(presence)[id];
      
        if (currentPresence?.online) {
            presence.setOnline(id, req.data.last_seen_at);
        } else {
            presence.setOffline(id, req.data.last_seen_at);
        }
      }
      
      return req.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useCurrentProfile() {
  return createQuery({
    queryKey: profileKeys.current(),
    queryFn: async (): Promise<Profile> => {
      const req = await makeRequest<Profile>('users/me', null, true, 'GET');
      if (!req.data) throw new Error('No profile data in response');
      return req.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useProfileInvalidations() {
  const queryClient = useQueryClient();
  return {
    invalidateProfile: (id: number) => queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) }),
    invalidateCurrentProfile: () => queryClient.invalidateQueries({ queryKey: profileKeys.current() }),
    invalidateAllProfiles: () => queryClient.invalidateQueries({ queryKey: profileKeys.all }),
  };
}
