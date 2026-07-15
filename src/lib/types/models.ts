export interface ApiError {
    code: number;
    message: string;
}

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: ApiError;
}

export interface User {
    id: number;
    username: string;
    name: string;
    email: string | null;
    is_bot: boolean;
    bio: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    is_active: boolean;
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserPublic {
    id: number;
    username: string;
    name: string;
    is_bot: boolean;
    bio: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    last_seen_at: string | null;
}

export interface AuthResponse {
    user: UserPublic;
    access_token: string;
    refresh_token: string;
}

export enum ChatType {
    DM = 'DM',
    GROUP = 'GROUP',
    CHANNEL = 'CHANNEL'
}

export interface Chat {
    id: number;
    chat_type: string;
    name: string | null;
    description: string | null;
    avatar_url: string | null;
    owner_id: number | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    members: ChatMember[];
    member_count: number;
}

export interface ChatPreview {
    id: number;
    chat_type: string;
    name: string | null;
    description: string | null;
    avatar_url: string | null;
    is_public: boolean;
    member_count: number;
    last_message: Message | null;
    last_user: UserPublic | null;
    other_user: UserPublic | null;
    last_read_message_id?: number | null;
    unread_count?: number;
}
 
export interface ChatMember {
    chat_id: number;
    user_id: number;
    role: string;
    custom_nickname: string | null;
    can_send_messages: boolean;
    can_manage_messages: boolean;
    can_manage_members: boolean;
    can_manage_chat: boolean;
    joined_at: string;
    last_read_message_id: number | null;
}

export interface PhotoMedia {
    type: 'Photo';
    file_id: string;
    file_url: string;
    width: number;
    height: number;
    file_size: number;
    thumbnail_url?: string | null;
    spoiler: boolean;
}

export interface DocumentMedia {
    type: 'Document';
    file_id: string;
    file_url: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    thumbnail_url?: string | null;
}

export interface VideoMedia {
    type: 'Video';
    file_id: string;
    file_url: string;
    width: number;
    height: number;
    duration?: number | null;
    file_size: number;
    thumbnail_url?: string | null;
    supports_streaming: boolean;
}

export interface AudioMedia {
    type: 'Audio';
    file_id: string;
    file_url: string;
    duration?: number | null;
    file_name?: string | null;
    mime_type: string;
    file_size: number;
    thumbnail_url?: string | null;
}

export interface VoiceMedia {
    type: 'Voice';
    file_id: string;
    file_url: string;
    duration?: number | null;
    file_size: number;
    waveform?: number[] | null;
}

export interface PollMedia {
    type: 'Poll';
    id: number;
    question: string;
    options: PollOption[];
    allows_multiple: boolean;
    anonymous: boolean;
    is_quiz: boolean;
    explanation?: string | null;
    close_period?: number | null;
    correct_option_indexes?: number[] | null;
    has_voted?: boolean;
    user_voted_options?: number[];
    allow_revote: boolean;
}

export interface GeoMedia {
    type: 'Geo';
    latitude: number;
    longitude: number;
    title?: string | null;
    address?: string | null;
}

export interface ContactMedia {
    type: 'Contact';
    phone_number: string;
    first_name: string;
    last_name?: string | null;
    vcard?: string | null;
}

export interface StickerMedia {
    type: 'Sticker';
    file_id: string;
    file_url: string;
    width: number;
    height: number;
    emoji?: string | null;
    set_name?: string | null;
}

export interface GifMedia {
    type: 'Gif';
    file_id: string;
    file_url: string;
    width: number;
    height: number;
    duration?: number | null;
    file_size: number;
    preview_url?: string | null;
}

export type MessageMedia = 
    | PhotoMedia
    | DocumentMedia
    | VideoMedia
    | AudioMedia
    | VoiceMedia
    | PollMedia
    | GeoMedia
    | ContactMedia
    | StickerMedia
    | GifMedia;

export interface GifSearchResult {
    id: string;
    title: string;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    size: number;
    source: string;
    search_query?: string;
}

export type GifItem = GifSearchResult;

export interface GifAttachmentPayload extends GifSearchResult {}

export interface RecentGif {
    id: number;
    user_id: number;
    gif_id: string;
    title: string;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    size: number;
    source: string;
    search_query?: string;
    created_at: string;
}

export interface GifListPagination {
    total: number;
    count: number;
    offset: number;
    limit: number;
    has_more: boolean;
}

export interface GifListResponse {
    gifs: GifItem[];
    pagination: GifListPagination;
}

export interface RecentGifsResponse {
    gifs: RecentGif[];
    pagination: GifListPagination;
}

export interface MessageReaction {
    id: number;
    message_id: number;
    user_id: number;
    emoji: string;
    created_at: string;
}

export type MessageStatus = 'sending' | 'sent' | 'read';

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    reply_to_message_id: number | null;
    content: string;
    is_edited: boolean;
    created_at: string;
    edited_at: string | null;
    media: MessageMedia[] | null;
    reactions: MessageReaction[] | null;
    status?: MessageStatus;
    clientId?: string;
    new_chat_members?: UserPublic[] | null;
    left_chat_member?: UserPublic | null;
    new_chat_title?: string | null;
    delete_chat_photo?: boolean | null;
    chat_created_type?: string | null;
    migrate_to_chat_id?: number | null;
    migrate_from_chat_id?: number | null;
    pinned_message?: Message | null;
}

export interface Poll {
    id: number;
    chat_id: number;
    message_id: number | null;
    question: string;
    allows_multiple: boolean;
    anonymous: boolean;
    is_quiz: boolean;
    explanation: string | null;
    is_closed: boolean;
    allow_revote: boolean;
    created_at: string;
}

export interface PollOption {
    id?: number;
    poll_id?: number;
    text: string;
    votes_count?: number;
    is_correct?: boolean | null;
    voters?: User[] | null;
    voters_count?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

export interface InviteCode {
    code: string;
    chat_id: number;
    created_by: number;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
}

