<script lang="ts">
    import type { MessageAttachment } from '$lib/types/models';
    import { getServerUrl } from '$lib/config';
    import { Download, Music, FileText, Play, Loader, CircleAlert } from 'lucide-svelte';
    import MediaViewer from '$lib/components/forms/modals/MediaViewer.svelte';
    import { onMount, createEventDispatcher } from 'svelte';
    import { _ } from 'svelte-i18n';

    // Props
    export let attachment: MessageAttachment;
    export let isOwn: boolean = false;
    export let width: number | string | null = null;
    export let height: number | string | null = null;

    // Event dispatcher
    const dispatch = createEventDispatcher<{ loaded: { attachment: MessageAttachment }; view: { attachment: MessageAttachment }; error: { attachment: MessageAttachment; error: string } }>();

    // Constants
    const OBSERVER_THRESHOLD = 0.1;

    // State
    let loadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
    let progress = 0;
    let error: string | null = null;
    let showMediaViewer = false;
    let isInViewport = false;
    let element: HTMLElement;
    let observer: IntersectionObserver | null = null;
    let blobUrl: string | null = null;

    // Computed values
    $: fileType = getFileType(attachment);
    $: fileUrl = getUrl(attachment.file_url);
    $: displayUrl = blobUrl || fileUrl;
    $: thumbnailUrl = attachment.thumbnail_url ? getUrl(attachment.thumbnail_url) : null;
    $: fileSizeFormatted = formatFileSize(attachment.file_size);
    $: durationFormatted = attachment.duration ? formatDuration(attachment.duration) : null;
    $: isMediaFile = fileType === 'image' || fileType === 'gif' || fileType === 'video';
    $: containerWidth = typeof width === 'number' ? `${width}px` : (width || 'auto');
    $: containerHeight = isMediaFile 
        ? (typeof height === 'number' ? `${height}px` : (height || '200px'))
        : 'auto';

    // Utility functions
    function isMobileDevice(): boolean {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Event handlers
    function handleMediaClick() {
        if (fileType === 'image' || fileType === 'gif' || fileType === 'video') {
            if (isMobileDevice()) {
                const messageInput = document.querySelector('.message-input') as HTMLTextAreaElement;
                if (messageInput && document.activeElement === messageInput) {
                    messageInput.blur();
                }
            }
            showMediaViewer = true;
            dispatch('view', { attachment });
        } else {
            handleDownload();
        }
    }

    function handleMediaViewerClose() {
        showMediaViewer = false;
    }

    function handleDownload(event?: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = attachment.file_name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function loadMedia() {
        if (loadState === 'loading' || loadState === 'loaded') return;
       
        loadState = 'loading';
        error = null;
        progress = 0;
        
        try {
            if (fileType === 'image' || fileType === 'gif' || fileType === 'video') {
                const response = await fetch(fileUrl);
                const contentLength = response.headers.get('content-length');
                const total = contentLength ? parseInt(contentLength) : 0;
                
                if (!response.ok) {
                    throw new Error(`${$_('attachment_item.load_error')}: ${response.status}`);
                }
                
                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Cannot read response body');
                }
                
                let loaded = 0;
                const chunks: Uint8Array[] = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    loaded += value.length;
                    
                    if (total > 0) {
                        progress = Math.round((loaded / total) * 100);
                    } else {
                        progress = Math.min(progress + 5, 90);
                    }
                }
                
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                const blob = new Blob([result], { type: attachment.mime_type || 'image/jpeg' });
                const objectUrl = URL.createObjectURL(blob);
                
                blobUrl = objectUrl;
                
                progress = 100;
                completeLoad();
            } else {
                completeLoad();
            }
        } catch (err) {
            handleError(err);
        }
    }

    function completeLoad() {
        loadState = 'loaded';
        progress = 100;
        dispatch('loaded', { attachment });
    }

    function handleError(err: unknown) {
        loadState = 'error';
        error = err instanceof Error ? err.message : $_('attachment_item.load_error');
        dispatch('error', { attachment, error });
    }

    function setupObserver() {
        if (!element || typeof IntersectionObserver === 'undefined') {
            loadMedia();
            return;
        }

        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && loadState === 'idle') {
                        isInViewport = true;
                        loadMedia();
                        observer?.unobserve(element);
                    }
                });
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: OBSERVER_THRESHOLD
            }
        );

        observer.observe(element);
    }

    // Lifecycle hooks
    onMount(() => {
        setupObserver();
        
        return () => {
            if (observer) {
                observer.disconnect();
            }
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    });

    // Functions
    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getFileType(attachment: MessageAttachment): 'image' | 'gif' | 'video' | 'audio' | 'document' {
        const mime = attachment.mime_type?.toLowerCase() || '';
        const type = attachment.file_type?.toLowerCase() || '';

        if (type === 'gif' || mime === 'image/gif') return 'gif';
        if (type === 'image' || mime.startsWith('image/')) return 'image';
        if (type === 'video' || mime.startsWith('video/')) return 'video';
        if (type === 'audio' || mime.startsWith('audio/')) return 'audio';
        return 'document';
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} ${$_('attachment_item.bytes')}`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${$_('attachment_item.kb')}`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} ${$_('attachment_item.mb')}`;
    }

    function formatDuration(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
</script>

<div
    bind:this={element}
    class="attachment-container"
    data-type={fileType}
    data-load-state={loadState}
    data-own={isOwn}
    style="width: {containerWidth}; height: {isMediaFile ? containerHeight : 'auto'};"
>
    {#if loadState === 'loading'}
        <div class="loading-overlay" role="status" aria-label={$_('common.loading')}>
            <div class="loading-spinner">
                <Loader size={32} />
            </div>
            <div class="loading-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {progress}%"></div>
                </div>
                <span class="progress-text">{progress}%</span>
            </div>
        </div>
    {/if}

    {#if loadState === 'error'}
        <div class="error-overlay" role="alert">
            <CircleAlert size={32} />
            <p class="error-message">{error}</p>
            <button on:click={loadMedia} class="retry-button">
                {$_('attachment_item.retry')}
            </button>
        </div>
    {/if}

    {#if fileType === 'image' || fileType === 'gif'}
        <div
            class="attachment-media attachment-image"
            on:click={handleMediaClick}
            role="button"
            tabindex={loadState === 'loaded' ? 0 : -1}
            aria-label={`${$_(`attachment_item.open_${fileType}`)} ${attachment.file_name}`}
            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMediaClick(); } }}
        >
            {#if thumbnailUrl && loadState !== 'loaded'}
                <img
                    src={thumbnailUrl}
                    alt={attachment.file_name}
                    class="thumbnail"
                    loading="lazy"
                />
            {/if}
            
            {#if loadState === 'loaded'}
                <img
                    src={displayUrl}
                    alt={attachment.file_name}
                    class="full-image"
                    loading="lazy"
                />
            {/if}
            
            {#if fileType === 'gif'}
                <div class="file-badge gif-badge">GIF</div>
            {/if}
        </div>
        
    {:else if fileType === 'video'}
        <div
            class="attachment-media attachment-video"
            on:click={handleMediaClick}
            role="button"
            tabindex={loadState === 'loaded' ? 0 : -1}
            aria-label={`${$_('attachment_item.open_video')} ${attachment.file_name}`}
            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMediaClick(); } }}
        >
            {#if thumbnailUrl && loadState !== 'loaded'}
                <img
                    src={thumbnailUrl}
                    alt={attachment.file_name}
                    class="thumbnail"
                    loading="lazy"
                />
            {/if}
            
            {#if loadState === 'loaded'}
                <video
                    class="video-preview"
                    preload="metadata"
                    aria-hidden="true"
                >
                    <source src={displayUrl} type={attachment.mime_type || 'video/mp4'} />
                </video>
            {/if}
            
            <div class="media-overlay">
                <Play size={32} />
                {#if durationFormatted}
                    <div class="duration-badge">{durationFormatted}</div>
                {/if}
            </div>
        </div>
        
    {:else if fileType === 'audio'}
        <div class="attachment-file attachment-audio" data-own={isOwn}>
            <div class="file-card" role="button" tabindex="0" 
                 on:click={loadState === 'loaded' ? handleDownload : null}
                 on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDownload(); } }}>
                <div class="file-icon {isOwn ? 'accent' : 'muted'}">
                    <Music size={24} />
                </div>
                
                <div class="file-info">
                    <div class="file-name" title={attachment.file_name}>
                        {attachment.file_name}
                    </div>
                    <div class="file-meta">
                        {#if durationFormatted}
                            <span class="meta-item">{durationFormatted}</span>
                        {/if}
                        <span class="meta-item">{fileSizeFormatted}</span>
                    </div>
                </div>
                
                <div class="file-action">
                    {#if loadState === 'loaded'}
                        <audio
                            controls
                            preload="metadata"
                            class="audio-player"
                            on:click|stopPropagation
                        >
                            <source src={displayUrl} type={attachment.mime_type || 'audio/mpeg'} />
                        </audio>
                    {:else}
                        <button
                            on:click|stopPropagation={handleDownload}
                            class="download-button"
                            aria-label={$_('attachment_item.download_audio')}
                        >
                            <Download size={20} />
                        </button>
                    {/if}
                </div>
            </div>
        </div>
        
    {:else if fileType === 'document'}
        <div class="attachment-file attachment-document" data-own={isOwn}>
            <div
                class="file-card"
                on:click={handleDownload}
                role="button"
                tabindex="0"
                aria-label={`${$_('attachment_item.download_document')} ${attachment.file_name}`}
                on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDownload(); } }}
            >
                <div class="file-icon {isOwn ? 'accent' : 'muted'}">
                    <FileText size={24} />
                </div>
                
                <div class="file-info">
                    <div class="file-name" title={attachment.file_name}>
                        {attachment.file_name}
                    </div>
                    <div class="file-meta">
                        <span class="meta-item">{fileSizeFormatted}</span>
                        <span class="meta-item">{attachment.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                    </div>
                </div>
                
                <div class="file-action">
                    <Download size={20} class="download-icon" />
                </div>
            </div>
        </div>
    {/if}
</div>

<MediaViewer
    bind:open={showMediaViewer}
    {attachment}
    on:close={handleMediaViewerClose}
/>

<style>
    .attachment-container {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s ease;
        background: transparent;
        min-width: 0;
        min-height: 0;
    }

    .attachment-container[data-type="image"],
    .attachment-container[data-type="gif"],
    .attachment-container[data-type="video"] {
        min-width: 200px;
        min-height: 200px;
    }

    .loading-overlay,
    .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--surface-glass);
        backdrop-filter: blur(10px);
        z-index: 10;
        gap: 12px;
        padding: 16px;
    }

    .loading-spinner {
        color: var(--color-accent);
    }

    
    .loading-progress {
        width: 80%;
        max-width: 200px;
        text-align: center;
    }

    .progress-bar {
        height: 4px;
        background: var(--color-border);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
    }

    .progress-fill {
        height: 100%;
        background: var(--color-accent);
        border-radius: 2px;
        transition: width 0.3s ease;
    }

    .progress-text {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .error-overlay {
        color: var(--color-error);
        text-align: center;
    }

    .error-message {
        font-size: 0.9rem;
        margin: 8px 0;
    }

    .retry-button {
        padding: 6px 16px;
        background: var(--color-accent);
        color: var(--color-button-text);
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .retry-button:hover {
        opacity: 0.9;
    }

    .attachment-media {
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-elevated);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        width: 100%;
        height: 100%;
    }

    .attachment-media:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .attachment-media:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .attachment-media img,
    .attachment-media video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .thumbnail {
        filter: blur(4px);
        opacity: 0.7;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .full-image {
        opacity: 1;
        filter: none;
        transform: scale(1);
        transition: opacity 0.3s ease;
    }

    .media-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.3);
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
    }

    .file-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        backdrop-filter: blur(10px);
        z-index: 2;
    }

    .gif-badge {
        background: var(--surface-glass);
        color: var(--color-text-button);
    }

    .duration-badge {
        position: absolute;
        bottom: 8px;
        right: 8px;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        backdrop-filter: blur(10px);
    }

    .attachment-file {
        width: 100%;
        min-width: 180px;
        max-width: none;
    }

    .file-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: var(--surface-glass);
        border-radius: 8px;
        transition: var(--transition);
        cursor: pointer;
        border: 1px solid transparent;
    }

    .file-card:hover {
        filter: var(--hover-filter)
    }

    .file-icon {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: var(--color-bg-elevated);
        color: var(--color-text);
    }

    .file-icon.accent {
        background: var(--color-accent);
        color: var(--color-button-text);
    }

    .file-icon.muted {
        background: var(--color-bg-elevated);
        color: var(--color-text-muted);
    }

    .file-info {
        flex: 1;
        min-width: 0;
    }

    .file-name {
        font-weight: 500;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 2px;
    }

    .file-meta {
        display: flex;
        gap: 6px;
        font-size: 0.75rem;
        color: var(--color-text-button);
    }

    .meta-item {
        display: inline-block;
    }

    .file-action {
        flex-shrink: 0;
    }

    .audio-player {
        width: 100px;
        height: 28px;
    }

    .audio-player::-webkit-media-controls-panel {
        background: var(--color-bg-elevated);
    }

    .download-button {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .download-button:hover {
        color: var(--color-accent);
        filter: var(--hover-filter);
    }

    @media (max-width: 768px) {
        .attachment-file {
            min-width: 160px;
        }
        
        .audio-player {
            width: 90px;
        }
    }

    @media (max-width: 480px) {
        .file-card {
            padding: 8px;
            gap: 8px;
        }
        
        .file-icon {
            width: 32px;
            height: 32px;
        }
        
        .audio-player {
            width: 80px;
            height: 24px;
        }
    }
</style>