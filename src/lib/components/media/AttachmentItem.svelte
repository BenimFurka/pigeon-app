<script lang="ts">
    import type { MessageAttachment } from '$lib/types/models';
    import { getServerUrl } from '$lib/config';
    import { Download, Music, FileText, Play } from 'lucide-svelte';
    import MediaViewer from '$lib/components/forms/modals/MediaViewer.svelte';

    export let attachment: MessageAttachment;
    export let isOwn: boolean = false;

    let imageLoaded = false;
    let showMediaViewer = false;

    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getFileUrl(): string {
        return getUrl(attachment.file_url);
    }

    function getThumbnailUrl(): string | null {
        return attachment.thumbnail_url ? getUrl(attachment.thumbnail_url) : null;
    }

    function getFileType(): 'image' | 'gif' | 'video' | 'audio' | 'document' {
        if (attachment.file_type === 'gif' || attachment.mime_type === 'image/gif') return 'gif';
        if (attachment.file_type === 'image' || attachment.mime_type?.startsWith('image/')) return 'image';
        if (attachment.file_type === 'video' || attachment.mime_type?.startsWith('video/')) return 'video';
        if (attachment.file_type === 'audio' || attachment.mime_type?.startsWith('audio/')) return 'audio';
        return 'document';
    }

    function handleDownload(event?: MouseEvent | KeyboardEvent | TouchEvent) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const url = getFileUrl();
                    const link = document.createElement('a');
                    link.href = url;
        link.download = attachment.file_name;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} Б`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    }

    function formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    function getImageDimensions(): { width: number; height: number } {
        if (attachment.width && attachment.height) {
            const maxWidth = 400;
            const maxHeight = 300;
            const aspectRatio = attachment.width / attachment.height;
            
            let width = attachment.width;
            let height = attachment.height;
            
            if (width > maxWidth) {
                width = maxWidth;
                height = width / aspectRatio;
            }
            
            if (height > maxHeight) {
                height = maxHeight;
                width = height * aspectRatio;
            }
            
            return { width: Math.round(width), height: Math.round(height) };
        }
        
        return { width: 200, height: 150 };
    }

    function handleImageLoad() {
        imageLoaded = true;
    }

    function handleMediaClick() {
        if (fileType === 'image' || fileType === 'gif' || fileType === 'video') {
            showMediaViewer = true;
        } else {
            handleDownload();
        }
    }

    function handleMediaViewerClose() {
        showMediaViewer = false;
    }

    $: fileUrl = getFileUrl();
    $: thumbnailUrl = getThumbnailUrl();
    $: fileType = getFileType();
    $: dimensions = getImageDimensions();
</script>

{#if fileType === 'image' || fileType === 'gif'}
    <div class="attachment-item attachment-image-item {fileType === 'gif' ? 'gif-attachment' : ''}" style="height: {dimensions.height}px;">
        <div class="image-preview" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:click={handleMediaClick} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMediaClick(); } }}>
            {#if thumbnailUrl && !imageLoaded}
                <img src={thumbnailUrl} alt={attachment.file_name} class="attachment-image thumbnail" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:load={handleImageLoad} />
            {:else}
                <img src={fileUrl} alt={attachment.file_name} class="attachment-image full" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:load={handleImageLoad} />
            {/if}
            {#if fileType === 'gif'}
                <div class="gif-badge">GIF</div>
            {/if}
        </div>
    </div>
{:else if fileType === 'video'}
    <div class="attachment-item attachment-video-item" style="height: {dimensions.height}px;">
        <div class="video-preview" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:click={handleMediaClick} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMediaClick(); } }}>
            {#if thumbnailUrl && !imageLoaded}
                <img src={thumbnailUrl} alt={attachment.file_name} class="video-thumbnail" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:load={handleImageLoad} />
                <div class="video-play-overlay">
                    <Play size={48} />
                </div>
            {:else}
                <video preload="metadata" class="attachment-video" style="width: {dimensions.width}px; height: {dimensions.height}px;" on:loadeddata={handleImageLoad} on:click={handleMediaClick}>
                    <source src={fileUrl} type={attachment.mime_type || undefined} />
                    Ваш браузер не поддерживает видео
                </video>
                <div class="video-play-overlay">
                    <Play size={48} />
                </div>
            {/if}
        </div>
    </div>
{:else if fileType === 'audio'}
    <div class="attachment-item attachment-audio-item {isOwn ? 'own' : 'other'}">
        <div class="audio-player-card">
            <div class="attachment-icon {isOwn ? 'icon-accent' : 'icon-elevated'}">
                <Music size={32} />
            </div>
            <div class="attachment-info">
                <div class="attachment-name">{attachment.file_name}</div>
                <div class="audio-meta">
                    {#if attachment.duration}
                        <span class="audio-duration">{formatDuration(attachment.duration)}</span>
                    {/if}
                    <span class="attachment-size">{formatFileSize(attachment.file_size)}</span>
                </div>
            </div>
            <audio controls preload="metadata" class="audio-player">
                <source src={fileUrl} type={attachment.mime_type || undefined} />
                Ваш браузер не поддерживает аудио
            </audio>
        </div>
    </div>
{:else if fileType === 'document'}
    <div class="attachment-item attachment-document-item {isOwn ? 'own' : 'other'}">
        <div class="document-link" on:click={handleDownload} on:touchend={handleDownload} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDownload(); } }}>
            <div class="attachment-icon {isOwn ? 'icon-accent' : 'icon-elevated'}">
                <FileText size={32} />
            </div>
            <div class="attachment-info">
                <div class="attachment-name">{attachment.file_name}</div>
                <div class="attachment-size">{formatFileSize(attachment.file_size)}</div>
            </div>
            <div class="document-download">
                <Download size={20} />
            </div>
        </div>
    </div>
{/if}

<MediaViewer
    bind:open={showMediaViewer}
    {attachment}
    on:close={handleMediaViewerClose}
/>
<style>
    .attachment-item {
        margin: 0;
        border-radius: 8px;
        overflow: hidden;
    }

    .attachment-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 8px;
    }

    .icon-elevated {
        background: var(--color-bg-elevated);
        color: var(--color-text);
    }

    .icon-accent {
        background: var(--color-accent);
        color: var(--color-button-text);
    }

    .attachment-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .attachment-name {
        font-weight: 500;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .attachment-size {
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .attachment-image-item {
        max-width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .attachment-image.thumbnail {
        opacity: 0.8;
        filter: blur(1px);
        transition: all 0.3s ease;
    }

    .attachment-image.full {
        opacity: 1;
        filter: none;
    }

    .image-dimensions {
        position: absolute;
        bottom: 4px;
        right: 4px;
        background: var(--surface-glass);
        color: var(--color-text-button);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        backdrop-filter: blur(10px);
    }

    .gif-attachment .image-preview {
        position: relative;
    }

    .gif-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        background: var(--surface-glass);
        color: var(--color-text-button);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        backdrop-filter: blur(10px);
    }

    .image-preview {
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s;
        background: var(--color-bg-elevated);
    }

    .image-preview:hover {
        transform: scale(1.02);
    }

    .image-preview:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .attachment-image {
        display: block;
        object-fit: cover;
        border-radius: 8px;
    }

    .attachment-video-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
    }

    .video-preview {
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-elevated);
        transition: transform 0.2s;
    }

    .video-preview:hover {
        transform: scale(1.02);
    }

    .video-preview:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .video-thumbnail {
        display: block;
        object-fit: cover;
        border-radius: 8px;
    }

    .video-play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: var(--radius-md);
        width: 64px;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
    }

    .video-preview:hover .video-play-overlay {
        background: rgba(0, 0, 0, 0.8);
        transform: translate(-50%, -50%) scale(1.1);
    }

    .attachment-audio-item {
        width: 100%;
    }

    .audio-player-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--surface-glass);
        border-radius: 8px;
    }

    .audio-meta {
        display: flex;
        gap: 12px;
        font-size: 0.8rem;
        color: var(--color-text-muted);
    }

    .audio-player {
        flex: 1;
        min-width: 0;
        max-width: 300px;
        height: 32px;
    }

    .attachment-document-item {
        width: 100%;
    }

    .document-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--surface-glass);
        border-radius: 8px;
        text-decoration: none;
        color: var(--color-text);
        transition: background-color 0.2s;
        cursor: pointer;
    }

    .document-link:hover {
        filter: var(--hover-filter);
    }

    .document-download {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .document-link:hover .document-download {
        filter: var(--hover-filter)
    }
</style>

