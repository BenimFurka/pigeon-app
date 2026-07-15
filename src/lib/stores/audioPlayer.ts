import { writable, derived } from 'svelte/store';
import type { AudioMedia, VoiceMedia, MessageMedia } from '$lib/types/models';
import { getServerUrl } from '$lib/config';

export type AudioPlaybackState = {
  media: (AudioMedia | VoiceMedia) | null;
  blobUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
};

function createAudioPlayerStore() {
  const { subscribe, set, update } = writable<AudioPlaybackState>({
    media: null,
    blobUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isLoading: false,
    error: null,
  });

  let audioElement: HTMLAudioElement | null = null;
  let progressInterval: number | null = null;

  function initAudioElement() {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      audioElement = null;
    }
    audioElement = new Audio();
    audioElement.volume = getVolume();
    audioElement.addEventListener('loadedmetadata', () => {
      update(state => ({ ...state, duration: audioElement!.duration, isLoading: false }));
    });
    audioElement.addEventListener('ended', () => stop());
    audioElement.addEventListener('timeupdate', () => {
      if (audioElement) {
        update(state => ({ ...state, currentTime: audioElement.currentTime }));
      }
    });
  }

  function getVolume(): number {
    let volume = 0.7;
    update(state => { volume = state.volume; return state; });
    return volume;
  }

  async function load(media: AudioMedia | VoiceMedia) {
    stop();
    initAudioElement();
    update(state => ({ ...state, isLoading: true, error: null, media }));

    try {
      const url = getMediaFileUrl(media);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioElement!.src = blobUrl;
      audioElement!.load();

      update(state => ({
        ...state,
        blobUrl,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
      }));
    } catch (err) {
      update(state => ({ ...state, isLoading: false, error: err.message }));
    }
  }

  function play() {
    if (!audioElement || !audioElement.src) return;
    audioElement.play();
    update(state => ({ ...state, isPlaying: true }));
    startProgressInterval();
  }

  function pause() {
    if (!audioElement) return;
    audioElement.pause();
    update(state => ({ ...state, isPlaying: false }));
    stopProgressInterval();
  }

  function stop() {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    stopProgressInterval();
    const currentBlob = getBlobUrl();
    if (currentBlob) URL.revokeObjectURL(currentBlob);
    update(state => ({
      ...state,
      media: null,
      blobUrl: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,
    }));
  }

  function seekTo(seconds: number) {
    if (audioElement && audioElement.duration) {
      audioElement.currentTime = Math.min(Math.max(0, seconds), audioElement.duration);
      update(state => ({ ...state, currentTime: audioElement.currentTime }));
    }
  }

  function setVolume(vol: number) {
    const newVol = Math.min(1, Math.max(0, vol));
    if (audioElement) audioElement.volume = newVol;
    update(state => ({ ...state, volume: newVol }));
  }

  function startProgressInterval() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (audioElement) {
        update(state => ({ ...state, currentTime: audioElement.currentTime }));
      }
    }, 200);
  }

  function stopProgressInterval() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function getMediaFileUrl(media: AudioMedia | VoiceMedia): string {
    return getUrl(media.file_url);
  }
  
  function getUrl(path: string): string {
      const baseUrl = getServerUrl();
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${baseUrl}/${cleanPath}`;
  }

  function getBlobUrl(): string | null {
    let url = null;
    update(state => { url = state.blobUrl; return state; });
    return url;
  }

  return {
    subscribe,
    load,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
  };
}

export const audioPlayer = createAudioPlayerStore();
