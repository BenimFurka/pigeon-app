import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { get } from 'svelte/store';
import { makeRequest, uploadUserAvatar } from '$lib/api';
import { presence } from '$lib/stores/presence';
import type { UserPublic } from '$lib/types/models';
import { avatarKeys } from './avatar';

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
      const res = await makeRequest<Profile>(`users/${id}`, null, true, 'GET');
      if (!res.data) throw new Error('No profile data in response');
      
      if (res.data.last_seen_at) {
        const currentPresence = get(presence)[id];
      
        if (currentPresence?.online) {
            presence.setOnline(id, res.data.last_seen_at);
        } else {
            presence.setOffline(id, res.data.last_seen_at);
        }
      }
      
      return res.data;
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
      const res = await makeRequest<Profile>('users/me', null, true, 'GET');
      if (!res.data) throw new Error('No profile data in response');
      return res.data;
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

export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: async (payload: { name?: string | null; bio?: string | null }) => {
      const res = await makeRequest<UserPublic>('users/me', { data: payload }, true, 'PUT');
      if (!res.data) {
        throw new Error('Failed to update profile');
      }
      if (res.data.last_seen_at) {
        const currentPresence = get(presence)[res.data.id];
      
        if (currentPresence?.online) {
            presence.setOnline(res.data.id, res.data.last_seen_at);
        } else {
            presence.setOffline(res.data.id, res.data.last_seen_at);
        }
      }
      return res.data;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.current(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: async (file: File) => {
      const res = await uploadUserAvatar(file);
      if (!res.data) {
        throw new Error('Failed to upload avatar');
      }
      return res.data;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.current(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: avatarKeys.all });
    },
  });
}
