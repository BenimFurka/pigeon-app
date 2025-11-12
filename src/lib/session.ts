import { get } from 'svelte/store';
import { loggedIn, refreshTokens, currentUser } from '../stores/auth';
import { profiles } from '../stores/profile';
import { WSClient } from './ws-client';

const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000;

export class Session {
    private static instance: Session;
    private ws: WSClient | null = null;
    private _profile: any = null;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;
    
    private constructor() {}

    public static getInstance(): Session {
        if (!Session.instance) {
            Session.instance = new Session();
        }
        return Session.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        this.setupListeners();
        await this.checkAuthState();
    }

    public async checkAuthState(): Promise<void> {
        const hasTokens = this.hasValidTokens();
        
        if (!hasTokens) {
            loggedIn.set(false);
            return;
        }

        try {
            await this.initializeAuthenticatedSession();
        } catch (error) {
            console.error('Error initializing authenticated session:', error);
            this.clearSession();
        }
    }

    private async initializeAuthenticatedSession(): Promise<void> {
        if (!this.hasValidTokens()) {
            throw new Error('No valid tokens available');
        }

        await this.initializeWebSocket();
        await this.loadInitialData();

        this.setupTokenRefresh();

        loggedIn.set(true);
    }

    private async initializeWebSocket(): Promise<void> {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WSClient(token)
    }

    private async loadInitialData(): Promise<void> {
        try {
            this._profile = await profiles.getCurrentProfile();
            if (this._profile?.id) {
                currentUser.set(this._profile.id);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }

    private setupTokenRefresh(): void {
        this.clearTokenRefresh();
        
        this.tokenRefreshInterval = setInterval(async () => {
            if (this.hasValidTokens()) {
                try {
                    await refreshTokens();
                } catch (error) {
                    console.error('Failed to refresh tokens:', error);
                    this.clearSession();
                }
            }
        }, TOKEN_REFRESH_INTERVAL);
    }

    private setupListeners(): void {
        let previousValue = get(loggedIn);
        
        loggedIn.subscribe((isLoggedIn) => {
            if (previousValue && !isLoggedIn) {
                this.clearSession();
            }
            previousValue = isLoggedIn;
        });
    }

    private hasValidTokens(): boolean {
        console.log(localStorage.getItem('access_token'), localStorage.getItem('refresh_token'));
        return !!(localStorage.getItem('access_token') && localStorage.getItem('refresh_token'));
    }

    private clearTokenRefresh(): void {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    public clearSession(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.clearTokenRefresh();

        this._profile = null;
        currentUser.set(null);
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        loggedIn.set(false);
    }

    public async getProfile() {
        if (!this._profile && get(loggedIn)) {
            try {
                this._profile = await profiles.getCurrentProfile();
                if (this._profile?.id) {
                    currentUser.set(this._profile.id);
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
                throw error;
            }
        }
        return this._profile;
    }

    public isAuthenticated(): boolean {
        return this.hasValidTokens() && get(loggedIn);
    }

    public getWebSocket(): WSClient | null {
        return this.ws;
    }
}

export const session = Session.getInstance();
