import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { getApiUrl } from '../config';

export const avatarKeys = {
  all: ['avatars'] as const,
  detail: (id: number) => [...avatarKeys.all, id] as const,
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export function useAvatar(id: number, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: avatarKeys.detail(id),
    queryFn: async (): Promise<string> => {
      const url = getApiUrl(`users/${id}/avatar`);
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Avatar HTTP ${res.status}`);
      const blob = await res.blob();
      return blobToDataUrl(blob);
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    ...options,
  });
}

export function useAvatarInvalidation() {
  const qc = useQueryClient();
  return {
    invalidateAvatar: (id: number) => qc.invalidateQueries({ queryKey: avatarKeys.detail(id) }),
  };
}
