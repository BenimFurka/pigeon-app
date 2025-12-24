import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { getServerUrl } from '../config';

export const avatarKeys = {
  all: ['avatars'] as const,
  detail: (id: number | string) => [...avatarKeys.all, id] as const,
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export function useAvatar(avatarUrl: string | undefined | null, options?: { enabled?: boolean }) {
  return createQuery({
    queryKey: avatarKeys.detail(avatarUrl ?? ''),
    queryFn: async (): Promise<string | null> => {
      if (!avatarUrl) return null;
      
      const baseUrl = getServerUrl();
      const cleanPath = avatarUrl.startsWith('/') ? avatarUrl.slice(1) : avatarUrl;
      const url = `${baseUrl}/${cleanPath}`;
      
      try {
        const res = await fetch(url, {
        });
        
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(`Avatar HTTP ${res.status}`);
        }
        
        const blob = await res.blob();
        if (blob.size === 0) return null;
        
        return blobToDataUrl(blob);
      } catch (error) {
        console.error('Error loading avatar:', error);
        return null;
      }
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    ...options,
  });
}

export function useAvatarInvalidation() {
  const qc = useQueryClient();
  return {
    invalidateAvatar: (id: number | string) => 
      qc.invalidateQueries({ queryKey: avatarKeys.detail(id) }),
  };
}
