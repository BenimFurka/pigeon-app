import { get } from 'svelte/store';
import { loggedIn, refreshTokens } from '../stores/auth';
import { profiles } from '../stores/profile';
import { WSClient } from './ws/client';

export class Session {
    private static instance: Session;
    public ws: WSClient | null = null;
    private _profile: any = null;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;
    
    private constructor() {}

    public static getInstance(): Session {
        if (!Session.instance) {
            Session.instance = new Session();
        }
        return Session.instance;
    }

    public async initialize(): Promise<void> {
        if (!localStorage.getItem("refresh_token")) {
            await refreshTokens();
        }
        loggedIn.subscribe(async (isLoggedIn) => {
            if (isLoggedIn) {
                await this.setupAuthenticatedSession();
                this.setupTokenRefresh();
            } else {
                this.clearSession();
            }
        });

        if (get(loggedIn)) {
            await this.setupAuthenticatedSession();
            this.setupTokenRefresh();
        }
    }


    public async getProfile() {
        if (!this._profile && get(loggedIn)) {
            try {
                this._profile = await profiles.getCurrentProfile();
            } catch (error) {
                console.error('Failed to load profile:', error);
            }
        }
        return this._profile;
    }

    private async setupAuthenticatedSession() {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                if (this.ws) {
                    this.ws.close();
                }
                this.ws = new WSClient(token);
            }
            this._profile = await profiles.getCurrentProfile();
        } catch (error) {
            console.error('Failed to setup authenticated session:', error);
            this.clearSession();
        }
    }

    public clearSession() {
        this._profile = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    private setupTokenRefresh() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        this.tokenRefreshInterval = setInterval(async () => {
            if (get(loggedIn)) {
                try {
                    await refreshTokens();
                    const token = localStorage.getItem('access_token');
                    if (token && this.ws) {
                        this.ws.close();
                        this.ws = new WSClient(token);
                    }
                } catch (error) {
                    console.error('Failed to refresh tokens:', error);
                    this.clearSession();
                }
            }
        }, 5 * 60 * 1000);
    }
}

export const session = Session.getInstance();
