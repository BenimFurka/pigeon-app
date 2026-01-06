<script lang="ts">
    import type { MessageAttachment } from '../../types/models';
    import { getServerUrl } from '../../config';
    import { Download, Music, FileText } from 'lucide-svelte';

    export let attachment: MessageAttachment;
    export let isOwn: boolean = false;

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

    function handleDownload(event?: MouseEvent | KeyboardEvent) {
        if (event) {
            event.preventDefault();
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

    $: fileUrl = getFileUrl();
    $: thumbnailUrl = getThumbnailUrl();
    $: fileType = getFileType();
</script>
{#if fileType === 'image' || fileType === 'gif'}
    <div class="attachment-item attachment-image-item {fileType === 'gif' ? 'gif-attachment' : ''}">
        <div class="image-preview" on:click={handleDownload} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDownload(e); } }}>
            {#if thumbnailUrl}
                <img src={thumbnailUrl} alt={attachment.file_name} class="attachment-image" />
            {:else}
                <img src={fileUrl} alt={attachment.file_name} class="attachment-image" />
            {/if}
            {#if fileType === 'gif'}
                <div class="gif-badge">GIF</div>
            {/if}
        </div>
    </div>
{:else if fileType === 'video'}
    <div class="attachment-item attachment-video-item">
        <div class="video-container">
            <video controls preload="metadata" class="attachment-video">
                <source src={fileUrl} type={attachment.mime_type || undefined} />
                <track kind="captions" />
                Ваш браузер не поддерживает видео
            </video>
        </div>
    </div>
{:else if fileType === 'audio'}
    <div class="attachment-item attachment-audio-item {isOwn ? 'own' : 'other'}">
        <div class="audio-player-card">
            <div class="attachment-icon {isOwn ? 'icon-elevated' : 'icon-accent'}">
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
        <a href={fileUrl} download={attachment.file_name} class="document-link" on:click={handleDownload}>
            <div class="attachment-icon {isOwn ? 'icon-elevated' : 'icon-accent'}">
                <FileText size={32} />
            </div>
            <div class="attachment-info">
                <div class="attachment-name">{attachment.file_name}</div>
                <div class="attachment-size">{formatFileSize(attachment.file_size)}</div>
            </div>
            <div class="document-download">
                <Download size={20} />
            </div>
        </a>
    </div>
{/if}
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

    .icon-accent {
        background: var(--color-accent);
        color: var(--color-text);
    }

    .icon-elevated {
        background: var(--color-bg-elevated);
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
    }

    .image-preview {
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s;
    }

    .image-preview:hover {
        transform: scale(1.02);
    }

    .image-preview:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .attachment-image {
        max-width: 100%;
        max-height: 400px;
        display: block;
        object-fit: contain;
        border-radius: 8px;
    }

    .attachment-video-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .video-container {
        border-radius: 8px;
        overflow: hidden;
        background: var(--color-bg-elevated)
    }

    .attachment-video {
        max-width: 100%;
        max-height: 400px;
        display: block;
        width: 100%;
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

