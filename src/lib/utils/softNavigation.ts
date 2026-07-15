import { browser } from '$app/environment';
import { dev } from '$app/environment';

export function softNavigate(url: string) {
    if (!browser) return;

    let finalUrl = url;
    if (!dev) {
        const currentPath = window.location.pathname;
        const isOnWebBase = currentPath.startsWith('/web/');
        
        if (url.startsWith('/chats/')) {
            finalUrl = '/web' + url;
        } else if (url === '/chats') {
            finalUrl = isOnWebBase ? url : '/web/chats';
        } else if (url === '/') {
            finalUrl = isOnWebBase ? '/web/' : '/';
        }
    }

    window.history.pushState({}, '', finalUrl);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
}

export function getCurrentChatId(): number | null {
    if (!browser) return null;

    const pathMatch = window.location.pathname.match(/^\/(web\/)?chats\/(\d+)$/);
    return pathMatch ? parseInt(pathMatch[2], 10) : null;
}

export function isInChat(): boolean {
    return getCurrentChatId() !== null;
}