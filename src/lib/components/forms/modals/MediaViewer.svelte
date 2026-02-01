<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
    import { Download, X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-svelte';
    import type { MessageAttachment } from '$lib/types/models';
    import { getServerUrl } from '$lib/config';

    export let open: boolean = false;
    export let attachment: MessageAttachment;
    export let zIndex: number = 1000;
    
    const dispatch = createEventDispatcher<{ close: void }>();

    let videoElement: HTMLVideoElement;
    let containerElement: HTMLDivElement;
    let progressSlider: HTMLInputElement;
    let volumeSlider: HTMLInputElement;
    let isVideoPlaying = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let isMuted = false;
    let isFullscreen = false;
    let isDragging = false;
    let showControls = true;
    let controlsTimeout: NodeJS.Timeout;

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getFileUrl(): string {
        return getUrl(attachment.file_url);
    }

    function getFileType(): 'image' | 'gif' | 'video' | 'audio' | 'document' {
        if (attachment.file_type === 'gif' || attachment.mime_type === 'image/gif') return 'gif';
        if (attachment.file_type === 'image' || attachment.mime_type?.startsWith('image/')) return 'image';
        if (attachment.file_type === 'video' || attachment.mime_type?.startsWith('video/')) return 'video';
        if (attachment.file_type === 'audio' || attachment.mime_type?.startsWith('audio/')) return 'audio';
        return 'document';
    }

    function close() {
        if (videoElement) {
            videoElement.pause();
            videoElement.currentTime = 0;
        }
        dispatch('close');
    }

    function handleDownload(event?: MouseEvent | KeyboardEvent | TouchEvent) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const url = getFileUrl();
        
        window.open(url, '_blank');
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            close();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!open) return;
        
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                close();
                break;
            case ' ':
                if (fileType === 'video') {
                    event.preventDefault();
                    togglePlayPause();
                }
                break;
            case 'f':
            case 'F':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    toggleFullscreen();
                }
                break;
            case 'm':
            case 'M':
                if (fileType === 'video') {
                    event.preventDefault();
                    toggleMute();
                }
                break;
            case 'ArrowRight':
                if (fileType === 'video') {
                    event.preventDefault();
                    skip(5);
                }
                break;
            case 'ArrowLeft':
                if (fileType === 'video') {
                    event.preventDefault();
                    skip(-5);
                }
                break;
        }
    }

    function togglePlayPause() {
        if (!videoElement) return;
        
        if (videoElement.paused) {
            videoElement.play();
            isVideoPlaying = true;
        } else {
            videoElement.pause();
            isVideoPlaying = false;
        }
    }

    function toggleMute() {
        if (!videoElement) return;
        
        isMuted = !isMuted;
        videoElement.muted = isMuted;
        if (!isMuted) {
            videoElement.volume = volume;
        }
        if (volumeSlider) {
            volumeSlider.value = isMuted ? '0' : (volume * 100).toString();
            updateVolumeSliderBackground(volumeSlider);
        }
    }

    function handleVolumeChange(e: Event) {
        const target = e.target as HTMLInputElement;
        volume = parseFloat(target.value) / 100;
        if (!isMuted && videoElement) {
            videoElement.volume = volume;
        }
        updateVolumeSliderBackground(target);
    }

    function updateVolumeSliderBackground(slider: HTMLInputElement) {
        const value = parseFloat(slider.value);
        const percentage = (value / parseFloat(slider.max)) * 100;
        slider.style.background = `linear-gradient(to right, white 0%, white ${percentage}%, rgba(255, 255, 255, 0.2) ${percentage}%, rgba(255, 255, 255, 0.2) 100%)`;
    }

    function updateProgressSliderBackground(slider: HTMLInputElement) {
        const value = parseFloat(slider.value);
        const percentage = (value / parseFloat(slider.max)) * 100;
        const clampedPercentage = Math.min(100, Math.max(0, percentage));
        slider.style.background = `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${clampedPercentage}%, rgba(255, 255, 255, 0.2) ${clampedPercentage}%, rgba(255, 255, 255, 0.2) 100%)`;
    }

    function handleSeek(e: Event) {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        if (videoElement) {
            videoElement.currentTime = (value / 100) * duration;
        }
        updateProgressSliderBackground(target);
    }

    function handleTimeUpdate() {
        if (videoElement) {
            currentTime = videoElement.currentTime;
            duration = videoElement.duration || 0;
            if (progressSlider && !isDragging) {
                const newProgress = duration > 0 ? (currentTime / duration) * 100 : 0;
                progressSlider.value = newProgress.toString();
                updateProgressSliderBackground(progressSlider);
            }
        }
    }

    function handleVideoClick() {
        if (fileType === 'video') {
            togglePlayPause();
        }
    }

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function skip(seconds: number) {
        if (!videoElement) return;
        
        videoElement.currentTime = Math.max(0, Math.min(videoElement.currentTime + seconds, duration));
    }

    function toggleFullscreen() {
        if (!containerElement) return;
        
        if (!document.fullscreenElement) {
            containerElement.requestFullscreen?.();
            isFullscreen = true;
        } else {
            document.exitFullscreen?.();
            isFullscreen = false;
        }
    }

    function handleFullscreenChange() {
        isFullscreen = !!document.fullscreenElement;
    }

    function resetControlsTimer() {
        showControls = true;
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (isVideoPlaying) {
                showControls = false;
            }
        }, 3000);
    }

    function handleMouseMove() {
        if (fileType === 'video') {
            resetControlsTimer();
        }
    }

    $: fileType = getFileType();
    $: fileUrl = getFileUrl();
    $: progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    $: if (open) {
        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    } else {
        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        
        const blockOutsideEvents = () => {
            if (open) {
                document.body.style.overflow = 'hidden';
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
            }
        };
        
        const unblockOutsideEvents = () => {
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
        
        const handleGlobalClick = (e: MouseEvent) => {
            if (open && containerElement && !containerElement.contains(e.target as Node)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };
        
        const handleGlobalContextmenu = (e: MouseEvent) => {
            if (open && containerElement && !containerElement.contains(e.target as Node)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        };
        
        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if (open) {
                const allowedKeys = ['Escape', ' ', 'f', 'F', 'm', 'M', 'ArrowRight', 'ArrowLeft'];
                if (!allowedKeys.includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        };
        
        document.addEventListener('click', handleGlobalClick, true);
        document.addEventListener('contextmenu', handleGlobalContextmenu, true);
        document.addEventListener('keydown', handleGlobalKeydown, true);
        
        blockOutsideEvents();
        
        if (progressSlider) {
            updateProgressSliderBackground(progressSlider);
        }
        if (volumeSlider) {
            updateVolumeSliderBackground(volumeSlider);
        }
        
        return () => {
            window.removeEventListener('keydown', handleKeydown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('click', handleGlobalClick, true);
            document.removeEventListener('contextmenu', handleGlobalContextmenu, true);
            document.removeEventListener('keydown', handleGlobalKeydown, true);
            unblockOutsideEvents();
            clearTimeout(controlsTimeout);
        };
    });

    onDestroy(() => {
        clearTimeout(controlsTimeout);
    });
</script>

{#if open}
<div
    class="media-viewer-backdrop"
    style={`z-index: ${zIndex};`}
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-label="Просмотр медиа"
    bind:this={containerElement}
    on:mousemove={handleMouseMove}
    on:mouseleave={() => showControls = true}
    transition:fade
>
    <button
        class="control-button close-button"
        on:click={close}
        aria-label="Закрыть"
    >
        <X size={24} />
    </button>

    <button
        class="control-button download-button"
        on:click={handleDownload}
        on:touchend={handleDownload}
        aria-label="Скачать"
    >
        <Download size={24} />
    </button>

    <div class="media-container">
        {#if fileType === 'image' || fileType === 'gif'}
            <div class="image-wrapper" on:click={close}>
                <img
                    src={fileUrl}
                    alt={attachment.file_name}
                    class="media-image"
                    loading="eager"
                />
                {#if fileType === 'gif'}
                    <div class="gif-badge">GIF</div>
                {/if}
            </div>
        {:else if fileType === 'video'}
            <div
                class="video-wrapper"
                on:click={handleVideoClick}
            >
                <video
                    bind:this={videoElement}
                    src={fileUrl}
                    class="media-video"
                    on:timeupdate={handleTimeUpdate}
                    on:loadedmetadata={handleTimeUpdate}
                    on:play={() => isVideoPlaying = true}
                    on:pause={() => isVideoPlaying = false}
                    on:ended={() => isVideoPlaying = false}
                    on:progress={handleTimeUpdate}
                >
                    <source src={fileUrl} type={attachment.mime_type || 'video/mp4'} />
                    Ваш браузер не поддерживает видео
                </video>

                {#if showControls}
                    <div class="video-controls-overlay" on:click|stopPropagation>
                        <div class="video-controls">
                            <button
                                class="video-control-button"
                                on:click={togglePlayPause}
                                aria-label={isVideoPlaying ? 'Пауза' : 'Воспроизвести'}
                            >
                                {#if isVideoPlaying}
                                    <Pause size={20} />
                                {:else}
                                    <Play size={20} />
                                {/if}
                            </button>

                            <div class="time-display">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>

                            <input
                                type="range"
                                class="progress-slider"
                                bind:this={progressSlider}
                                value={progress}
                                min="0"
                                max="100"
                                step="0.1"
                                on:input={handleSeek}
                                on:mousedown={() => isDragging = true}
                                on:mouseup={() => isDragging = false}
                                aria-label="Прогресс видео"
                            />

                            <div class="volume-controls">
                                <button
                                    class="video-control-button"
                                    on:click={toggleMute}
                                    aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                                >
                                    {#if isMuted || volume === 0}
                                        <VolumeX size={20} />
                                    {:else}
                                        <Volume2 size={20} />
                                    {/if}
                                </button>
                                <input
                                    type="range"
                                    class="volume-slider"
                                    bind:this={volumeSlider}
                                    value={isMuted ? 0 : volume * 100}
                                    min="0"
                                    max="100"
                                    step="1"
                                    on:input={handleVolumeChange}
                                    aria-label="Громкость"
                                />
                            </div>

                            <button
                                class="video-control-button"
                                on:click={toggleFullscreen}
                                aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                            >
                                {#if isFullscreen}
                                    <Minimize2 size={20} />
                                {:else}
                                    <Maximize2 size={20} />
                                {/if}
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <div class="file-info">
        <span class="file-name">{attachment.file_name}</span>
        {#if attachment.file_size}
            <span class="file-size">({Math.round(attachment.file_size / 1024)} KB)</span>
        {/if}
    </div>
</div>
{/if}

<style>
    .media-viewer-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .control-button {
        position: absolute;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--color-bg-elevated);
        color: white;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 10;
    }

    .control-button:hover {
        transform: scale(1.1);
    }

    .close-button {
        top: 20px;
        right: 20px;
    }

    .download-button {
        top: 20px;
        left: 20px;
    }

    .media-container {
        max-width: 90vw;
        max-height: 80vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .image-wrapper {
        cursor: zoom-out;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .media-image {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .video-wrapper {
        position: relative;
        max-width: 100%;
        max-height: 80vh;
        cursor: pointer;
    }

    .media-video {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        background: black;
    }

    .video-controls-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
        padding: 20px;
        border-radius: 0 0 8px 8px;
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    .video-controls {
        display: flex;
        align-items: center;
        gap: 15px;
        width: 100%;
    }

    .video-control-button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }

    .video-control-button:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .time-display {
        color: white;
        font-family: monospace;
        font-size: 0.9rem;
        min-width: 100px;
        text-align: center;
        user-select: none;
    }

    .progress-slider {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
    }

    .progress-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-accent);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .progress-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--color-accent);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        border: none;
    }

    .volume-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 120px;
    }

    .volume-slider {
        width: 80px;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: 1px solid rgba(0, 0, 0, 0.3);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 0.1s ease;
    }

    .volume-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
    }

    .volume-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: 1px solid rgba(0, 0, 0, 0.3);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        transition: transform 0.1s ease;
    }

    .volume-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
    }

    .file-info {
        position: absolute;
        bottom: 20px;
        text-align: center;
        justify-content: center;
        align-items: center;
        display: flex;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
        padding: 10px;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
        max-width: fit-content;
        min-width: max-content;
    }

    .file-name {
        font-weight: 500;
        margin-right: 8px;
    }

    .file-size {
        color: rgba(255, 255, 255, 0.6);
    }

    .gif-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    :global(video::-webkit-media-controls) {
        display: none !important;
    }

    @media (max-width: 768px) {
        .media-container {
            max-width: 95vw;
            max-height: 85vh;
        }

        .control-button {
            width: 40px;
            height: 40px;
        }

        .video-controls {
            gap: 10px;
        }

        .time-display {
            min-width: 80px;
            font-size: 0.8rem;
        }

        .volume-controls {
            min-width: 100px;
        }

        .volume-slider {
            width: 60px;
        }
    }

    @media (max-width: 480px) {
        .video-controls {
            flex-wrap: wrap;
            justify-content: center;
        }

        .progress-slider {
            order: 1;
            width: 100%;
            margin-top: 10px;
        }

        .volume-controls {
            order: 2;
        }
    }
</style>