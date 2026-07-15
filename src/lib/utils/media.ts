import type { MessageMedia, PhotoMedia, VideoMedia, DocumentMedia, AudioMedia, VoiceMedia, PollMedia, GeoMedia, ContactMedia, StickerMedia, GifMedia } from '$lib/types/models';

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getMediaType(media: MessageMedia): string {
    switch (media.type) {
        case 'Gif':
            return 'gif';
        case 'Photo':
            return 'image';
        case 'Video':
            return 'video';
        case 'Audio':
            return 'audio';
        case 'Voice':
            return 'audio';
        case 'Document':
            return 'document';
        case 'Poll':
            return 'poll';
        case 'Geo':
            return 'location';
        case 'Contact':
            return 'contact';
        case 'Sticker':
            return 'sticker';
        default:
            return 'document';
    }
}

export function getMediaTypeName(media: MessageMedia, $_: any): string {
    const type = getMediaType(media);
    return $_(`common.mediaTypes.${type}`);
}

export function getMediaTitle(media: MessageMedia): string {
    switch (media.type) {
        case 'Photo':
            return 'Photo';
        case 'Video':
            return 'Video';
        case 'Document':
            return (media as DocumentMedia).file_name || 'Document';
        case 'Audio':
            return (media as AudioMedia).file_name || 'Audio';
        case 'Voice':
            return 'Voice Message';
        case 'Poll':
            return (media as PollMedia).question;
        case 'Geo':
            return (media as GeoMedia).title || 'Location';
        case 'Contact':
            const contact = media as ContactMedia;
            return `${contact.first_name} ${contact.last_name || ''}`.trim();
        case 'Sticker':
            return 'Sticker';
        case 'Gif':
            return 'GIF';
        default:
            return 'Media';
    }
}

export function getMediaSubtitle(media: MessageMedia): string {
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
            return `${optionsCount} options • ${totalVotes} votes`;
        case 'Geo':
            const geo = media as GeoMedia;
            return `${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)}`;
        case 'Contact':
            const contact = media as ContactMedia;
            return contact.phone_number;
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

export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function validateMediaCombination(media: MessageMedia[]): string | null {
    if (media.length > 10) {
        return 'Too many media items (max 10)';
    }
    
    const types = new Set(media.map(m => m.type));
    
    if (types.has('Photo') || types.has('Video')) {
        const allowedTypes: Array<'Photo' | 'Video'> = ['Photo', 'Video'];
        const hasOnlyAllowedTypes = Array.from(types).every(type => allowedTypes.includes(type as 'Photo' | 'Video'));
        
        if (!hasOnlyAllowedTypes) {
            return 'Albums can only contain photos and videos';
        }
    }
    
    const exclusiveTypes: Array<'Poll' | 'Geo' | 'Contact' | 'Audio' | 'Voice' | 'Sticker' | 'Gif' | 'Document'> = ['Poll', 'Geo', 'Contact', 'Audio', 'Voice', 'Sticker', 'Gif', 'Document'];
    const hasExclusiveType = exclusiveTypes.some(type => types.has(type as any));
    
    if (hasExclusiveType && types.size > 1) {
        return 'This media type cannot be combined with others';
    }
    
    return null;
}

export function isAlbum(media: MessageMedia[]): boolean {
    if (media.length <= 1) return false;
    
    const types = new Set(media.map(m => m.type));
    const hasOnlyPhotoAndVideo = Array.from(types).every(type => 
        type === 'Photo' || type === 'Video'
    );
    
    return hasOnlyPhotoAndVideo;
}

export function getAlbumLayout(media: MessageMedia[]): 'single' | 'two-horizontal' | 'three-horizontal' | 'grid' {
    if (media.length === 2) {
        return 'two-horizontal';
    } else if (media.length === 3) {
        return 'three-horizontal';
    } else if (media.length >= 4) {
        return 'grid';
    }
    return 'single';
}
