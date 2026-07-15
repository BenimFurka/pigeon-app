import { writable } from 'svelte/store';

export interface OpenMenuInfo {
    messageId: number;
    x: number;
    y: number;
}

export const menuStore = writable<{
    openMenu: OpenMenuInfo | null;
}>({
    openMenu: null
});

export const menuActions = {
    openMenu: (messageId: number, x: number, y: number) => {
        menuStore.update(store => {
            if (store.openMenu && store.openMenu.messageId !== messageId) {
                return { openMenu: null };
            }
            if (store.openMenu && store.openMenu.messageId === messageId) {
                return { openMenu: null };
            }
            return { openMenu: { messageId, x, y } };
        });
    },
    
    closeMenu: () => {
        menuStore.update(store => {
            const wasOpen = store.openMenu !== null;
            const result = { ...store, openMenu: null };
            
            if (wasOpen && typeof window !== 'undefined') {
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobileDevice) {
                    const messageInput = document.querySelector('.message-input') as HTMLTextAreaElement;
                    if (messageInput) {
                        queueMicrotask(() => {
                            messageInput.focus();
                        });
                    }
                }
            }
            
            return result;
        });
    }
};
