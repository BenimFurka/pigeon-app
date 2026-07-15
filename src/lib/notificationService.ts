import { get } from 'svelte/store';
import { config } from '$lib/config';
import type { Message, ChatPreview, UserPublic } from '$lib/types/models';

class NotificationService {
    private audio: HTMLAudioElement | null = null;
    private isSupported = false;

    constructor() {
        this.checkSupport();
    }

    private checkSupport(): void {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    }

    private async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported) {
            return 'denied';
        }

        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission;
        }

        return Notification.permission;
    }

    private async loadAudio(): Promise<void> {
        if (this.audio) {
            return;
        }

        try {
            this.audio = new Audio('/assets/notification.mp3');
            this.audio.volume = 0.5;
            await this.audio.load();
        } catch (error) {
            console.warn('Failed to load notification sound:', error);
        }
    }

    private async playSound(): Promise<void> {
        const currentConfig = get(config);
        
        if (!currentConfig?.app?.notifications?.sound) {
            return;
        }

        await this.loadAudio();
        
        if (this.audio) {
            try {
                this.audio.currentTime = 0;
                await this.audio.play();
            } catch (error) {
                console.warn('Failed to play notification sound:', error);
            }
        }
    }

    private createNotificationTitle(chat: ChatPreview, sender: UserPublic | null): string {
        if (chat.chat_type === 'DM' && sender) {
            return sender.name;
        }
        
        return chat.name || 'New Message';
    }

    private createNotificationBody(
        chat: ChatPreview, 
        sender: UserPublic | null, 
        message: Message
    ): string {
        if (chat.chat_type === 'DM') {
            return message.content || 'Sent a message';
        }
        
        const senderName = sender?.name || 'Someone';
        return `${senderName}: ${message.content || 'Sent a message'}`;
    }

    private createNotificationOptions(
        chat: ChatPreview,
        message: Message
    ): NotificationOptions {
        const options: NotificationOptions = {
            body: this.createNotificationBody(chat, null, message),
            icon: chat.avatar_url || '/favicon.png',
            tag: `chat-${chat.id}`,
            renotify: true,
            requireInteraction: false
        };

        if (chat.avatar_url) {
            options.icon = chat.avatar_url;
        }

        return options;
    }

    async showNotification(
        chat: ChatPreview,
        sender: UserPublic | null,
        message: Message
    ): Promise<void> {
        const currentConfig = get(config);

        if (!currentConfig?.app?.notifications?.enabled) {
            console.log('Notifications disabled or config not loaded');
            return;
        }

        if (!this.isSupported) {
            return;
        }

        const permission = await this.requestPermission();
        if (permission !== 'granted') {
            return;
        }

        try {
            const title = this.createNotificationTitle(chat, sender);
            const options = this.createNotificationOptions(chat, message);
            
            options.body = this.createNotificationBody(chat, sender, message);

            const notification = new Notification(title, options);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            await this.playSound();
        } catch (error) {
            console.warn('Failed to show notification:', error);
        }
    }

    isPermissionGranted(): boolean {
        return Notification.permission === 'granted';
    }

    async requestPermissionIfNeeded(): Promise<boolean> {
        const permission = await this.requestPermission();
        return permission === 'granted';
    }
}

export const notificationService = new NotificationService();
