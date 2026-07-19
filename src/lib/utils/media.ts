import type { MessageMedia, PhotoMedia, VideoMedia, DocumentMedia, AudioMedia, VoiceMedia, PollMedia, GeoMedia, ContactMedia, StickerMedia, GifMedia } from '$lib/types/models';

export interface MediaLayoutItem {
	x: number;
	y: number;
	width: number;
	height: number;
	item: number;
}

export interface MediaLayout {
	width: number;
	height: number;
	layout: MediaLayoutItem[];
}

export interface MediaLayoutWithPercents extends MediaLayout {
	layout: Array<MediaLayoutItem & { xPercent: number; widthPercent: number }>;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getMediaType(media: MessageMedia): string {
    switch (media.type) {
        case 'Gif': return 'gif';
        case 'Photo': return 'image';
        case 'Video': return 'video';
        case 'Audio': return 'audio';
        case 'Voice': return 'audio';
        case 'Document': return 'document';
        case 'Poll': return 'poll';
        case 'Geo': return 'location';
        case 'Contact': return 'contact';
        case 'Sticker': return 'sticker';
        default: return 'document';
    }
}

export function getMediaTypeName(media: MessageMedia, $_: any): string {
    const type = getMediaType(media);
    return $_(`common.mediaTypes.${type}`);
}

export function getMediaTitle(media: MessageMedia): string {
    switch (media.type) {
        case 'Photo': return 'Photo';
        case 'Video': return 'Video';
        case 'Document': return (media as DocumentMedia).file_name || 'Document';
        case 'Audio': return (media as AudioMedia).file_name || 'Audio';
        case 'Voice': return 'Voice Message';
        case 'Poll': return (media as PollMedia).question;
        case 'Geo': return (media as GeoMedia).title || 'Location';
        case 'Contact':
            const contact = media as ContactMedia;
            return `${contact.first_name} ${contact.last_name || ''}`.trim();
        case 'Sticker': return 'Sticker';
        case 'Gif': return 'GIF';
        default: return 'Media';
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
        case 'Document': return formatFileSize((media as DocumentMedia).file_size);
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
        default: return '';
    }
}

export function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function validateMediaCombination(media: MessageMedia[]): string | null {
    if (media.length > 10) return 'Too many media items (max 10)';
    const types = new Set(media.map(m => m.type));
    if (types.has('Photo') || types.has('Video')) {
        const allowedTypes: Array<'Photo' | 'Video'> = ['Photo', 'Video'];
        if (!Array.from(types).every(type => allowedTypes.includes(type as 'Photo' | 'Video'))) {
            return 'Albums can only contain photos and videos';
        }
    }
    const exclusiveTypes: Array<'Poll' | 'Geo' | 'Contact' | 'Audio' | 'Voice' | 'Sticker' | 'Gif' | 'Document'> = ['Poll', 'Geo', 'Contact', 'Audio', 'Voice', 'Sticker', 'Gif', 'Document'];
    if (exclusiveTypes.some(type => types.has(type as any)) && types.size > 1) {
        return 'This media type cannot be combined with others';
    }
    return null;
}

export function isAlbum(media: MessageMedia[]): boolean {
    if (media.length <= 1) return false;
    const types = new Set(media.map(m => m.type));
    return Array.from(types).every(type => type === 'Photo' || type === 'Video');
}

export function getAlbumLayout(media: MessageMedia[]): 'single' | 'two-horizontal' | 'three-horizontal' | 'grid' {
    if (media.length === 2) return 'two-horizontal';
    if (media.length === 3) return 'three-horizontal';
    if (media.length >= 4) return 'grid';
    return 'single';
}

export function calculateMediaLayout(visualMedia: MessageMedia[], maxWidth: number | null, maxHeight: number = 800): MediaLayout | MediaLayoutWithPercents {
    if (!visualMedia.length || !maxWidth) {
        return { width: 0, height: 0, layout: [] };
    }

    const items = visualMedia.map(m => {
        let width = 200, height = 200;
        switch (m.type) {
            case 'Photo': { const p = m as PhotoMedia; width = p.width || 200; height = p.height || 200; break; }
            case 'Video': { const v = m as VideoMedia; width = v.width || 200; height = v.height || 200; break; }
            case 'Gif': { const g = m as GifMedia; width = g.width || 200; height = g.height || 200; break; }
            case 'Sticker': { const s = m as StickerMedia; width = s.width || 200; height = s.height || 200; break; }
            default: width = 200; height = 200;
        }
        return { w: width, h: height };
    });

    const layout = createAlbumLayout({
        items, maxWidth, minWidth: 50, spacing: 2, maxHeight, forMedia: true
    });

    if (visualMedia.length === 1) return layout;

    return {
        width: layout.width,
        height: layout.height,
        layout: layout.layout.map(item => ({
            ...item,
            xPercent: (item.x / layout.width) * 100,
            widthPercent: (item.width / layout.width) * 100
        }))
    };
}

function getOrientation(w: number, h: number): 'landscape' | 'portrait' | 'square' {
    const ratio = w / h;
    if (ratio > 1.2) return 'landscape';
    if (ratio < 0.8) return 'portrait';
    return 'square';
}

export function createAlbumLayout(options: {
    items: { w: number, h: number }[];
    maxWidth: number;
    minWidth: number;
    spacing: number;
    maxHeight?: number;
    forMedia?: boolean
}): MediaLayout {
    const { items, maxWidth, minWidth, spacing, maxHeight = maxWidth * 1.5 } = options;
    const count = items.length;

    if (count === 0) return { width: 0, height: 0, layout: [] };
    if (count === 1) {
        const item = items[0];
        const aspectRatio = item.w / item.h;
        const width = Math.min(item.w, maxWidth);
        const height = width / aspectRatio;
        return { width, height, layout: [{ x: 0, y: 0, width, height, item: 0 }] };
    }

    if (count === 2) return layoutTwoItems(items, maxWidth, spacing, maxHeight);
    if (count === 3) return layoutThreeItems(items, maxWidth, spacing, maxHeight);
    if (count === 4) return layoutFourItems(items, maxWidth, spacing, maxHeight);
    if (count === 5) return layoutFiveItems(items, maxWidth, spacing, maxHeight);

    return layoutGridItems(items, maxWidth, minWidth, spacing, maxHeight);
}

function layoutTwoItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number): MediaLayout {
    const orient1 = getOrientation(items[0].w, items[0].h);
    const orient2 = getOrientation(items[1].w, items[1].h);

    if (orient1 === 'portrait' || (orient1 === 'square' && orient2 === 'portrait')) {
        const width1 = Math.round((maxWidth - spacing) * 0.5);
        const width2 = maxWidth - spacing - width1;
        const height = Math.min(width1 / (items[0].w / items[0].h), width2 / (items[1].w / items[1].h), maxHeight);
        return {
            width: maxWidth, height,
            layout: [
                { x: 0, y: 0, width: width1, height, item: 0 },
                { x: width1 + spacing, y: 0, width: width2, height, item: 1 }
            ]
        };
    }

    const height1 = Math.min(maxWidth / (items[0].w / items[0].h), (maxHeight - spacing) / 2);
    const height2 = Math.min(maxWidth / (items[1].w / items[1].h), (maxHeight - spacing) / 2);
    const targetHeight = Math.min(height1, height2, maxHeight / 2);

    return {
        width: maxWidth, height: targetHeight * 2 + spacing,
        layout: [
            { x: 0, y: 0, width: maxWidth, height: targetHeight, item: 0 },
            { x: 0, y: targetHeight + spacing, width: maxWidth, height: targetHeight, item: 1 }
        ]
    };
}

function layoutThreeItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number): MediaLayout {
    const orient1 = getOrientation(items[0].w, items[0].h);

    if (orient1 === 'portrait') {
        const leftWidth = Math.round((maxWidth - spacing) * 0.6);
        const rightWidth = maxWidth - spacing - leftWidth;
        const leftHeight = Math.min(leftWidth / (items[0].w / items[0].h), maxHeight);
        
        const rightHeight1 = Math.min((rightWidth / (items[1].w / items[1].h)), (leftHeight - spacing) / 2);
        const rightHeight2 = Math.min((rightWidth / (items[2].w / items[2].h)), (leftHeight - spacing) / 2);
        const targetRightHeight = Math.min(rightHeight1, rightHeight2);

        return {
            width: maxWidth, height: leftHeight,
            layout: [
                { x: 0, y: 0, width: leftWidth, height: leftHeight, item: 0 },
                { x: leftWidth + spacing, y: 0, width: rightWidth, height: targetRightHeight, item: 1 },
                { x: leftWidth + spacing, y: targetRightHeight + spacing, width: rightWidth, height: targetRightHeight, item: 2 }
            ]
        };
    }

    const topHeight = Math.min(maxWidth / (items[0].w / items[0].h), maxHeight * 0.66);
    const bottomWidth = (maxWidth - spacing) / 2;
    const bottomHeight1 = Math.min(bottomWidth / (items[1].w / items[1].h), (maxHeight - topHeight - spacing));
    const bottomHeight2 = Math.min(bottomWidth / (items[2].w / items[2].h), (maxHeight - topHeight - spacing));
    const targetBottomHeight = Math.min(bottomHeight1, bottomHeight2);

    return {
        width: maxWidth, height: topHeight + targetBottomHeight + spacing,
        layout: [
            { x: 0, y: 0, width: maxWidth, height: topHeight, item: 0 },
            { x: 0, y: topHeight + spacing, width: bottomWidth, height: targetBottomHeight, item: 1 },
            { x: bottomWidth + spacing, y: topHeight + spacing, width: bottomWidth, height: targetBottomHeight, item: 2 }
        ]
    };
}

function layoutFourItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number): MediaLayout {
    const orient1 = getOrientation(items[0].w, items[0].h);

    if (orient1 === 'portrait') {
        const leftWidth = Math.round((maxWidth - spacing) * 0.6);
        const rightWidth = maxWidth - spacing - leftWidth;
        const leftHeight = Math.min(leftWidth / (items[0].w / items[0].h), maxHeight);
        const rightItemHeight = (leftHeight - 2 * spacing) / 3;
        
        return {
            width: maxWidth, height: leftHeight,
            layout: [
                { x: 0, y: 0, width: leftWidth, height: leftHeight, item: 0 },
                { x: leftWidth + spacing, y: 0, width: rightWidth, height: rightItemHeight, item: 1 },
                { x: leftWidth + spacing, y: rightItemHeight + spacing, width: rightWidth, height: rightItemHeight, item: 2 },
                { x: leftWidth + spacing, y: 2 * rightItemHeight + 2 * spacing, width: rightWidth, height: rightItemHeight, item: 3 }
            ]
        };
    }

    const topHeight = Math.min(maxWidth / (items[0].w / items[0].h), maxHeight * 0.66);
    const bottomWidth = (maxWidth - 2 * spacing) / 3;
    const bottomHeight = Math.min(maxHeight - topHeight - spacing, bottomWidth / Math.max(...items.slice(1).map(item => item.w / item.h)));

    return {
        width: maxWidth, height: topHeight + bottomHeight + spacing,
        layout: [
            { x: 0, y: 0, width: maxWidth, height: topHeight, item: 0 },
            { x: 0, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 1 },
            { x: bottomWidth + spacing, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 2 },
            { x: 2 * (bottomWidth + spacing), y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 3 }
        ]
    };
}

function layoutFiveItems(items: { w: number, h: number }[], maxWidth: number, spacing: number, maxHeight: number): MediaLayout {
    const topHeight = Math.min(maxWidth / (items[0].w / items[0].h), maxHeight * 0.5);
    const bottomWidth = (maxWidth - spacing) / 2;
    const bottomHeight = Math.min((maxHeight - topHeight - spacing) / 2, bottomWidth / Math.max(...items.slice(1).map(item => item.w / item.h)));

    return {
        width: maxWidth, height: topHeight + 2 * bottomHeight + spacing,
        layout: [
            { x: 0, y: 0, width: maxWidth, height: topHeight, item: 0 },
            { x: 0, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 1 },
            { x: bottomWidth + spacing, y: topHeight + spacing, width: bottomWidth, height: bottomHeight, item: 2 },
            { x: 0, y: topHeight + bottomHeight + 2 * spacing, width: bottomWidth, height: bottomHeight, item: 3 },
            { x: bottomWidth + spacing, y: topHeight + bottomHeight + 2 * spacing, width: bottomWidth, height: bottomHeight, item: 4 }
        ]
    };
}

function layoutGridItems(items: { w: number, h: number }[], maxWidth: number, minWidth: number, spacing: number, maxHeight: number): MediaLayout {
    const count = items.length;
    
    if (count >= 7) {
        const firstItem = items[0];
        const firstAspectRatio = firstItem.w / firstItem.h;
        
        const topHeight = Math.min(maxWidth / firstAspectRatio, maxHeight * 0.4);
        
        const remainingItems = items.slice(1);
        const cols = 3;
        const rows = Math.ceil(remainingItems.length / cols);
        
        const bottomItemWidth = (maxWidth - spacing * (cols - 1)) / cols;
        
        const avgRemainingAspectRatio = remainingItems.reduce((sum, item) => sum + (item.w / item.h), 0) / remainingItems.length;
        
        let bottomItemHeight: number;
        if (avgRemainingAspectRatio > 1.3) {
            bottomItemHeight = bottomItemWidth / Math.max(avgRemainingAspectRatio, 1.5);
        } else {
            bottomItemHeight = bottomItemWidth;
        }
        
        const layout: MediaLayoutItem[] = [];
        
        layout.push({
            x: 0,
            y: 0,
            width: maxWidth,
            height: topHeight,
            item: 0
        });
        
        for (let i = 0; i < remainingItems.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            layout.push({
                x: col * (bottomItemWidth + spacing),
                y: topHeight + spacing + row * (bottomItemHeight + spacing),
                width: bottomItemWidth,
                height: bottomItemHeight,
                item: i + 1
            });
        }
        
        const totalHeight = topHeight + spacing + rows * bottomItemHeight + spacing * (rows - 1);
        
        return {
            width: maxWidth,
            height: Math.min(totalHeight, maxHeight),
            layout
        };
    }
    
    const avgAspectRatio = items.reduce((sum, item) => sum + (item.w / item.h), 0) / items.length;
    let cols = avgAspectRatio > 1.3 ? 2 : 3;
    
    if (items.length <= 7 && avgAspectRatio > 1.1) {
        cols = 2;
    }
    
    const rows = Math.ceil(items.length / cols);
    const itemWidth = (maxWidth - spacing * (cols - 1)) / cols;
    
    let itemHeight: number;
    if (avgAspectRatio > 1.3) {
        itemHeight = itemWidth / Math.max(avgAspectRatio, 1.5);
    } else {
        itemHeight = itemWidth;
    }
    
    const maxItemHeight = maxHeight / rows;
    itemHeight = Math.min(itemHeight, maxItemHeight);

    const layout: MediaLayoutItem[] = [];
    for (let i = 0; i < items.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        layout.push({
            x: col * (itemWidth + spacing),
            y: row * (itemHeight + spacing),
            width: itemWidth,
            height: itemHeight,
            item: i
        });
    }

    const totalHeight = rows * itemHeight + spacing * (rows - 1);
    
    return {
        width: maxWidth,
        height: Math.min(totalHeight, maxHeight),
        layout
    };
}

export function isVisualMedia(type: MessageMedia['type']): boolean {
  return type === 'Photo' || type === 'Video' || type === 'Gif' || type === 'Sticker';
}

export function getMediaFileUrl(media: MessageMedia): string {
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

export function getMediaThumbnailUrl(media: MessageMedia): string | null {
  switch (media.type) {
    case 'Photo': return (media as PhotoMedia).thumbnail_url || null;
    case 'Video': return (media as VideoMedia).thumbnail_url || null;
    case 'Gif': return (media as GifMedia).preview_url || null;
    default: return null;
  }
}

export function getMediaFileName(media: MessageMedia): string {
  const timestamp = Date.now();
  switch (media.type) {
    case 'Photo': return `photo_${timestamp}.jpg`;
    case 'Video': return `video_${timestamp}.mp4`;
    case 'Document': return (media as DocumentMedia).file_name || 'document';
    case 'Audio': return (media as AudioMedia).file_name || `audio_${timestamp}.mp3`;
    case 'Voice': return `voice_${timestamp}.ogg`;
    case 'Gif': return `gif_${timestamp}.gif`;
    case 'Sticker': return `sticker_${timestamp}.webp`;
    default: return 'file';
  }
}

export function getMediaMimeType(media: MessageMedia): string | null {
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