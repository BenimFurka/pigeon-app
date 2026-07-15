import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getWebSocketUrl } from '$lib/config';
import { getIsTauriEnvironment } from '$lib/tauri-env';
import type { ServerMessage, ClientMessage } from '$lib/types/websocket';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface MessageHandler {
  (message: ServerMessage): void;
}

interface StatusHandler {
  (status: ConnectionStatus, details?: string): void;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private status: ConnectionStatus = 'disconnected';
  private token: string | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<StatusHandler> = new Set();
  private unlisteners: UnlistenFn[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000;
  private readonly baseReconnectDelay = 1000;
  private browserSocket: WebSocket | null = null;
  private isDisposed = false;
  private isAuthenticated = false;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async connect(token: string): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.token = token;
    this.isDisposed = false;
    this.isAuthenticated = false;
    this.setStatus('connecting');

    const isTauri = await getIsTauriEnvironment();

    if (isTauri) {
      await this.connectTauri();
    } else {
      this.connectBrowser();
    }
  }

  private async connectTauri(): Promise<void> {
    try {
      await this.setupTauriListeners();
      await invoke('init_websocket', {
        url: getWebSocketUrl(),
        token: this.token
      });
      this.reconnectAttempts = 0;
    } catch (error) {
      this.setStatus('error', String(error));
      this.scheduleReconnect();
    }
  }

  private async setupTauriListeners(): Promise<void> {
    this.clearListeners();

    const unlistenMessage = await listen('ws-message', (event) => {
      console.log(event);
      this.handleMessage(event.payload as ServerMessage);
    });

    const unlistenStatus = await listen('ws-status', (event) => {
      const { status, details } = event.payload as { status: ConnectionStatus; details?: string };
      console.log(`[WebSocket] Status change: ${status}`, details ? `Details: ${details}` : '');
      this.setStatus(status, details);
      
      if (status === 'disconnected' || status === 'error') {
        this.scheduleReconnect();
      }
    });

    this.unlisteners.push(unlistenMessage, unlistenStatus);
  }

  private connectBrowser(): void {
    this.disconnectBrowser();

    const socket = new WebSocket(getWebSocketUrl());
    this.browserSocket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.sendBrowser({ type: 'authenticate', data: { token: `Bearer ${this.token}` } });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        this.handleMessage(message);
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    socket.onclose = () => {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      this.setStatus('error');
      this.scheduleReconnect();
    };
  }

  private disconnectBrowser(): void {
    if (this.browserSocket) {
      this.browserSocket.close();
      this.browserSocket = null;
    }
  }

  disconnect(): void {
    this.isDisposed = true;
    this.isAuthenticated = false;
    this.clearReconnectTimer();
    this.disconnectBrowser();
    this.clearListeners();

    getIsTauriEnvironment().then((isTauri) => {
      if (isTauri) {
        invoke('disconnect_websocket').catch(console.error);
      }
    });

    this.setStatus('disconnected');
  }

  async send(message: ClientMessage): Promise<void> {
    const isTauri = await getIsTauriEnvironment();

    if (isTauri) {
      await invoke('send_websocket_message', { message: JSON.stringify(message) });
    } else {
      this.sendBrowser(message);
    }
  }

  private sendBrowser(message: ClientMessage): void {
    if (this.browserSocket?.readyState === WebSocket.OPEN) {
      this.browserSocket.send(JSON.stringify(message));
    }
  }

  onMessage(type: ServerMessage['type'], handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);

    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private handleMessage(message: ServerMessage): void {
    if (message.type === 'authenticated') {
      this.isAuthenticated = true;
      console.log('[WebSocket] Authentication successful');
    }
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((h) => h(message));
    }
  }

  private setStatus(status: ConnectionStatus, details?: string): void {
    this.status = status;
    this.statusHandlers.forEach((h) => h(status, details));
  }

  private scheduleReconnect(): void {
    if (this.isDisposed || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(
      this.maxReconnectDelay,
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    );
    this.reconnectAttempts++;

    console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token && !this.isDisposed) {
        this.connect(this.token);
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearListeners(): void {
    this.unlisteners.forEach((unlisten) => unlisten());
    this.unlisteners = [];
  }

  async votePoll(messageId: number, optionIds: number[]): Promise<void> {
    await this.send({
      type: 'vote_poll',
      data: { message_id: messageId, option_ids: optionIds }
    });
  }

  async unvotePoll(messageId: number): Promise<void> {
    await this.send({
      type: 'unvote_poll',
      data: { message_id: messageId }
    });
  }
}

export const wsService = WebSocketService.getInstance();
