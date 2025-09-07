declare namespace Tauri {
  interface Event<T> {
    event: string;
    id: number;
    payload: T;
  }

  interface EventCallback<T> {
    (event: Event<T>): void;
  }

  interface EventApi {
    listen<T>(event: string, handler: EventCallback<T>): Promise<() => void>;
    emit(event: string, payload?: any): Promise<void>;
  }
}

declare global {
  interface Window {
    __TAURI__?: {
      event: Tauri.EventApi;
      convertFileSrc: (src: string, protocol: string) => string;
    };
  }
}
