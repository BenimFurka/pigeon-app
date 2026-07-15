<script lang="ts">
    import type { MessageMedia, PhotoMedia, VideoMedia, DocumentMedia, AudioMedia, VoiceMedia, PollMedia, GeoMedia, ContactMedia, StickerMedia, GifMedia, Message } from '$lib/types/models';
    import { createEventDispatcher, onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { Download, Play, MapPin, User, FileText, Volume2, MessageSquare, CheckCircle, XCircle, BarChart3, Loader, CircleAlert, Music } from 'lucide-svelte';
    import { formatFileSize } from '$lib/utils/media';
    import MediaViewer from '$lib/components/forms/modals/MediaViewer.svelte';
    import { getServerUrl } from '$lib/config';
    import Poll from '$lib/components/shared/Poll.svelte';
    import { polls } from '$lib/stores/polls';
    import { audioPlayer } from '$lib/stores/audioPlayer';

    export let media: MessageMedia;
    export let isInAlbum: boolean = false;
    export let compact: boolean = false;
    export let width: number | string | null = null;
    export let height: number | string | null = null;
    export let currentUserId: number | null = null;
    export let message: Message | null = null;

    const dispatch = createEventDispatcher<{ view: { media: MessageMedia }; loaded: { media: MessageMedia }; error: { media: MessageMedia; error: string } }>();

    // State
    let loadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
    let progress = 0;
    let error: string | null = null;
    let showMediaViewer = false;
    let blobUrl: string | null = null;
    let element: HTMLElement;

    // Computed values
    $: mediaUrl = getUrl(getMediaFileUrl(media));
    $: displayUrl = blobUrl || mediaUrl;
    $: thumbnailUrl = getMediaThumbnailUrl(media) ? getUrl(getMediaThumbnailUrl(media)) : null;
    $: isMediaFile = media.type === 'Photo' || media.type === 'Video' || media.type === 'Gif' || media.type === 'Sticker';
    $: containerWidth = (isInAlbum && width === null) ? '100%' : (typeof width === 'number' ? `${width}px` : (width || 'auto'));
    $: containerHeight = (isInAlbum && height === null)
        ? '100%'
        : (isMediaFile ? (typeof height === 'number' ? `${height}px` : (height || '200px')) : 'auto');


    $: stablePollData = media.type === 'Poll' ? {
        id: message?.id || 0,
        chat_id: message?.chat_id || 0,
        message_id: message?.id || 0,
        question: (media as PollMedia).question,
        allows_multiple: (media as PollMedia).allows_multiple,
        anonymous: (media as PollMedia).anonymous,
        is_quiz: (media as PollMedia).is_quiz,
        explanation: (media as PollMedia).explanation || null,
        is_closed: polls.get(message?.id || 0)?.poll.is_closed || false,
        created_at: message?.created_at || new Date().toISOString()
    } : null;

    $: stablePollOptions = media.type === 'Poll' ? (media as PollMedia).options : [];
    $: stablePollHasVoted = media.type === 'Poll' ? (media as PollMedia).has_voted || false : false;
    $: stablePollUserVotedOptions = media.type === 'Poll' ? (media as PollMedia).user_voted_options || [] : [];

    function getMediaIcon(media: MessageMedia) {
        switch (media.type) {
            case 'Photo': return Download;
            case 'Video': return Play;
            case 'Document': return FileText;
            case 'Audio': return Volume2;
            case 'Voice': return Volume2;
            case 'Poll': return BarChart3;
            case 'Geo': return MapPin;
            case 'Contact': return User;
            case 'Sticker': return MessageSquare;
            case 'Gif': return Play;
            default: return FileText;
        }
    }

    function getMediaTitle(media: MessageMedia): string {
        switch (media.type) {
            case 'Photo': return $_('media.photo');
            case 'Video': return $_('media.video');
            case 'Document': return (media as DocumentMedia).file_name || $_('media.document');
            case 'Audio': return (media as AudioMedia).file_name || $_('media.audio');
            case 'Voice': return $_('media.voice');
            case 'Poll': return (media as PollMedia).question;
            case 'Geo': return (media as GeoMedia).title || $_('media.location');
            case 'Contact': return `${(media as ContactMedia).first_name} ${(media as ContactMedia).last_name || ''}`.trim();
            case 'Sticker': return (media as StickerMedia).emoji || $_('media.sticker');
            case 'Gif': return $_('media.gif');
            default: return $_('media.unknown');
        }
    }

    function getMediaSubtitle(media: MessageMedia): string {
        switch (media.type) {
            case 'Photo':
                const photo = media as PhotoMedia;
                return `${photo.width} × ${photo.height} • ${formatFileSize(photo.file_size)}`;
            case 'Video':
                const video = media as VideoMedia;
                const duration = video.duration ? formatDuration(video.duration) : '';
                return `${video.width} × ${video.height} • ${duration} • ${formatFileSize(video.file_size)}`;
            case 'Document':
                return formatFileSize((media as DocumentMedia).file_size);
            case 'Audio':
                const audio = media as AudioMedia;
                const audioDuration = audio.duration ? formatDuration(audio.duration) : '';
                return `${audioDuration} • ${formatFileSize(audio.file_size)}`;
            case 'Voice':
                const voice = media as VoiceMedia;
                const voiceDuration = voice.duration ? formatDuration(voice.duration) : '';
                return `${voiceDuration} • ${formatFileSize(voice.file_size)}`;
            case 'Poll':
                const poll = media as PollMedia;
                const optionsCount = poll.options.length;
                const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes_count || 0), 0);
                return `${optionsCount} ${$_('poll.options')} • ${totalVotes} ${$_('poll.votes')}`;
            case 'Geo':
                const geo = media as GeoMedia;
                return `${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)}`;
            case 'Sticker':
                const sticker = media as StickerMedia;
                return `${sticker.width} × ${sticker.height}`;
            case 'Gif':
                const gif = media as GifMedia;
                const gifDuration = gif.duration ? formatDuration(gif.duration) : '';
                return `${gif.width} × ${gif.height} • ${gifDuration} • ${formatFileSize(gif.file_size)}`;
            default:
                return '';
        }
    }

    function formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function handleClick(event?: Event) {
        if (media.type === 'Poll') {
            return;
        }
        
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (isMediaFile && (media.type === 'Photo' || media.type === 'Video' || media.type === 'Gif' || media.type === 'Sticker')) {
            showMediaViewer = true;
            dispatch('view', { media });
        } else if (media.type === 'Document' || media.type === 'Audio' || media.type === 'Voice') {
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
        
        const fileUrl = getMediaFileUrl(media);
        if (!fileUrl) return;
        
        const link = document.createElement('a');
        link.href = getUrl(fileUrl);
        link.download = getMediaFileName(media);
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
            if (isMediaFile) {
                const response = await fetch(mediaUrl);
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
                
                const mimeType = getMediaMimeType(media);
                const blob = new Blob([result], { type: mimeType || 'image/jpeg' });
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
        dispatch('loaded', { media });
    }

    function handleError(err: unknown) {
        loadState = 'error';
        error = err instanceof Error ? err.message : $_('attachment_item.load_error');
        dispatch('error', { media, error });
    }

    // Utility functions
    function getUrl(path: string): string {
        const baseUrl = getServerUrl();
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${baseUrl}/${cleanPath}`;
    }

    function getMediaFileUrl(media: MessageMedia): string {
        switch (media.type) {
            case 'Photo': return (media as PhotoMedia).file_url;
            case 'Video': return (media as VideoMedia).file_url;
            case 'Document': return (media as DocumentMedia).file_url;
            case 'Audio': return (media as AudioMedia).file_url;
            case 'Voice': return (media as VoiceMedia).file_url;
            case 'Sticker': return (media as StickerMedia).file_url;
            case 'Gif': return (media as GifMedia).file_url;
            default: return '';
        }
    }

    function getMediaThumbnailUrl(media: MessageMedia): string | null {
        switch (media.type) {
            case 'Photo': {
                const photo = media as PhotoMedia;
                return photo.thumbnail_url || null;
            }
            case 'Video': {
                const video = media as VideoMedia;
                return video.thumbnail_url || null;
            }
            case 'Gif': {
                const gif = media as GifMedia;
                return gif.preview_url || null;
            }
            default: return null;
        }
    }

    function getMediaFileName(media: MessageMedia): string {
        switch (media.type) {
            case 'Photo': return `photo_${Date.now()}.jpg`;
            case 'Video': return `video_${Date.now()}.mp4`;
            case 'Document': return (media as DocumentMedia).file_name || 'document';
            case 'Audio': return (media as AudioMedia).file_name || `audio_${Date.now()}.mp3`;
            case 'Voice': return `voice_${Date.now()}.ogg`;
            case 'Gif': return `gif_${Date.now()}.gif`;
            case 'Sticker': return `sticker_${Date.now()}.webp`;
            default: return 'file';
        }
    }

    function getMediaMimeType(media: MessageMedia): string | null {
        switch (media.type) {
            case 'Photo': return 'image/jpeg';
            case 'Video': return 'video/mp4';
            case 'Document': return (media as DocumentMedia).mime_type || null;
            case 'Audio': return (media as AudioMedia).mime_type || 'audio/mpeg';
            case 'Voice': return 'audio/ogg';
            case 'Gif': return 'image/gif';
            case 'Sticker': return 'image/webp';
            default: return null;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
        }
    }

    // Lifecycle hooks
    onMount(() => {
        loadMedia();
        
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    });

    $: icon = getMediaIcon(media);
    $: title = getMediaTitle(media);
    $: subtitle = getMediaSubtitle(media);
    $: isOwnMessage = message && currentUserId !== null ? message.sender_id === currentUserId : false;
</script>

<div
    class="media-item {compact ? 'compact' : ''} {isInAlbum ? 'in-album' : ''}"
    data-type={media.type}
    data-load-state={loadState}
    data-prevent-menu
    style="width: {containerWidth}; height: {isMediaFile ? containerHeight : 'auto'};"
    role="button"
    tabindex="0"
    on:click={handleClick}
    on:keydown={handleKeydown}
>
    {#if loadState === 'loading' && isMediaFile}
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

    {#if loadState === 'error' && isMediaFile}
        <div class="error-overlay" role="alert">
            <CircleAlert size={32} />
            <p class="error-message">{error}</p>
            <button on:click={loadMedia} class="retry-button">
                {$_('attachment_item.retry')}
            </button>
        </div>
    {/if}
    
    {#if media.type === 'Photo'}
        {@const photo = media}
        <div class="media-thumbnail">
            {#if thumbnailUrl && loadState !== 'loaded'}
                <img
                    src={thumbnailUrl}
                    alt={title}
                    class="thumbnail"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
            
            {#if loadState === 'loaded'}
                <img
                    src={displayUrl}
                    alt={title}
                    class="full-image"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
            
            {#if photo.spoiler}
                <div class="spoiler-overlay">
                    <span class="spoiler-text">{$_('media.spoiler')}</span>
                </div>
            {/if}
        </div>
    {:else if media.type === 'Video'}
        {@const video = media}
        <div class="media-thumbnail">
            {#if thumbnailUrl && loadState !== 'loaded'}
                <img
                    src={thumbnailUrl}
                    alt={title}
                    class="thumbnail"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
            
            {#if loadState === 'loaded'}
                <video
                    class="video-preview"
                    preload="metadata"
                    aria-hidden="true"
                >
                    <source src={displayUrl} type="video/mp4" />
                </video>
            {/if}
            
            <div class="media-overlay">
                <Play size={32} />
                {#if video.duration}
                    <div class="duration-badge">{formatDuration(video.duration)}</div>
                {/if}
            </div>
        </div>
    {:else if media.type === 'Document'}
        {@const doc = media}
        <div class="file-card">
            <div class="file-icon {isOwnMessage ? 'own-message' : 'other-message'}">
                <FileText size={compact ? 20 : 32} />
            </div>
            
            <div class="file-info">
                <div class="file-name" title={title}>{title}</div>
                <div class="file-meta">
                    <span class="meta-item">{subtitle}</span>
                </div>
            </div>
            
            <div class="file-action">
                <Download size={20} class="download-icon" />
            </div>
        </div>
    {:else if media.type === 'Audio'}
      <div class="file-card" on:click|stopPropagation={() => audioPlayer.load(media)}>
        <div class="file-icon">
          <Music size={compact ? 20 : 32} />
        </div>
        <div class="file-info">
          <div class="file-name">{title}</div>
          <div class="file-meta">{subtitle}</div>
        </div>
        <div class="file-action">
          <button on:click|stopPropagation={(e) => { e.stopPropagation(); audioPlayer.load(media); }}>
            <Play size={20} />
          </button>
        </div>
      </div>
    {:else if media.type === 'Voice'}
        {@const voice = media}
        <div class="file-card">
            <div class="file-icon {isOwnMessage ? 'own-message' : 'other-message'}">
                <Volume2 size={compact ? 20 : 32} />
            </div>
            
            <div class="file-info">
                <div class="file-name" title={title}>{title}</div>
                <div class="file-meta">
                    <span class="meta-item">{subtitle}</span>
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
                        <source src={displayUrl} type="audio/ogg" />
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
    {:else if media.type === 'Poll'}
            
        {#if stablePollData}
            <Poll 
                poll={stablePollData}
                options={stablePollOptions}
                messageId={message?.id || 0}
                {currentUserId}
                hasVoted={stablePollHasVoted}
                selectedOptions={stablePollUserVotedOptions}
            />
        {/if}
    {:else if media.type === 'Geo'}
        {@const geo = media}
        <div class="media-icon">
            <MapPin size={compact ? 20 : 32} />
        </div>
    {:else if media.type === 'Contact'}
        {@const contact = media}
        <div class="media-icon">
            <User size={compact ? 20 : 32} />
        </div>
    {:else if media.type === 'Sticker'}
        {@const sticker = media}
        <div class="media-thumbnail">
            {#if loadState === 'loaded'}
                <img
                    src={displayUrl}
                    alt={title}
                    class="full-image"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {:else}
                <img
                    src={sticker.file_url}
                    alt={title}
                    class="thumbnail"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
        </div>
    {:else if media.type === 'Gif'}
        {@const gif = media}
        <div class="media-thumbnail">
            {#if thumbnailUrl && loadState !== 'loaded'}
                <img
                    src={thumbnailUrl}
                    alt={title}
                    class="thumbnail"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
            
            {#if loadState === 'loaded'}
                <img
                    src={displayUrl}
                    alt={title}
                    class="full-image"
                    loading="lazy"
                    on:click|stopPropagation={handleClick}
                    on:keydown={(e) => e.key === 'Enter' && handleClick()}
                />
            {/if}
            
            <div class="file-badge gif-badge">GIF</div>
        </div>
    {/if}

    {#if (media.type == 'Audio')}
        <div class="media-info">
            <div class="media-title" title={title}>{title}</div>
            {#if !compact}
                <div class="media-subtitle">{subtitle}</div>
            {/if}
        </div>
    {/if}
</div>

<MediaViewer
    bind:open={showMediaViewer}
    media={media}
    on:close={handleMediaViewerClose}
/>

<style>
    .media-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 8px;
        transition: transform box-shadow 0.2s ease;
        border: 1px solid var(--border-color);
        min-width: 0;
        min-height: 0;
    }

    .media-item[data-type="Photo"],
    .media-item[data-type="Video"],
    .media-item[data-type="Gif"],
    .media-item[data-type="Sticker"] {
        min-width: 0;
        min-height: 0;
        padding: 0;
        border: none;
        background: transparent;
    }

    .media-item[data-type="Poll"] {
        padding: 0;
        border: none;
        background: transparent;
        width: 100%;
    }

    .media-item:hover {
        background: var(--hover-background);
    }

    .media-item[data-type="Photo"]:hover,
    .media-item[data-type="Video"]:hover,
    .media-item[data-type="Gif"]:hover,
    .media-item[data-type="Sticker"]:hover {
        background: transparent;
        transform: translateY(-2px);
    }

    .media-item[data-type="Poll"]:hover {
        background: transparent;
    }

    .media-item:focus {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
    }

    .media-item.compact {
        padding: 4px;
        gap: 8px;
        min-height: 40px;
    }

    .media-item.in-album {
        border-radius: 4px;
        margin-bottom: 2px;
        width: 100% !important;
        height: 100% !important;
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
        border-radius: 8px;
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

    .media-thumbnail {
        position: relative;
        width: 60px;
        height: 60px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .media-item[data-type="Photo"] .media-thumbnail,
    .media-item[data-type="Video"] .media-thumbnail,
    .media-item[data-type="Gif"] .media-thumbnail,
    .media-item[data-type="Sticker"] .media-thumbnail {
        width: 100%;
        height: 100%;
        border-radius: 8px;
    }

    .media-thumbnail:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .media-item.compact .media-thumbnail {
        width: 40px;
        height: 40px;
    }

    .media-thumbnail img,
    .media-thumbnail video {
        width: 100%;
        object-fit: cover;
        display: block;
    }

    .thumbnail {
        filter: blur(4px);
        opacity: 0.7;
        transition: opacity 0.3s ease, filter 0.3s ease;
    }

    .full-image {
        opacity: 1;
        filter: none;
        transform: scale(1);
        transition: opacity 0.3s ease;
    }

    .spoiler-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 500;
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

    .media-thumbnail:hover .media-overlay {
        opacity: 1;
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
        width: 100%;
    }

    .file-card:hover {
        filter: var(--hover-filter);
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

    .file-icon.own-message {
        background: var(--color-accent);
    }

    .file-icon.other-message {
        background: var(--surface-glass);
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
        color: var(--color-text);
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

    .media-icon {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-elevated);
        border-radius: 6px;
        color: var(--color-text-muted);
        flex-shrink: 0;
    }

    .media-item.compact .media-icon {
        width: 40px;
        height: 40px;
    }

    .media-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .media-title {
        font-weight: 500;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .media-subtitle {
        font-size: 12px;
        color: var(--color-text-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 768px) {
        .file-card {
            padding: 8px;
            gap: 8px;
        }
        
        .file-icon {
            width: 32px;
            height: 32px;
        }
        
        .audio-player {
            width: 90px;
        }

        .media-item[data-type="Photo"],
        .media-item[data-type="Video"],
        .media-item[data-type="Gif"],
        .media-item[data-type="Sticker"] {
            min-width: 160px;
            min-height: 160px;
        }
    }

    @media (max-width: 480px) {
        .file-card {
            padding: 6px;
            gap: 6px;
        }
        
        .file-icon {
            width: 28px;
            height: 28px;
        }
        
        .audio-player {
            width: 80px;
            height: 24px;
        }

        .media-item[data-type="Photo"],
        .media-item[data-type="Video"],
        .media-item[data-type="Gif"],
        .media-item[data-type="Sticker"] {
            min-width: 120px;
            min-height: 120px;
        }
    }
</style>
