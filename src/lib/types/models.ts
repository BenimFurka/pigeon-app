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

export interface ChatAttachment {
    id: number;
    chat_id: number;
    uploaded_by: number;
    file_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    thumbnail_url: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    created_at: string;
}

export interface GifAttachmentPayload {
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

export interface GifItem extends GifAttachmentPayload {}

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

export interface MessageAttachment {
    id: number;
    chat_id: number;
    uploaded_by: number;
    file_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    thumbnail_url: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    created_at: string;
}

export interface MessageReaction {
    id: number;
    message_id: number;
    user_id: number;
    emoji: string;
    created_at: string;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    reply_to_message_id: number | null;
    content: string;
    is_edited: boolean;
    created_at: string;
    edited_at: string | null;
    attachments: MessageAttachment[] | null;
    reactions: MessageReaction[] | null;
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
    created_at: string;
}

export interface PollOption {
    id: number;
    poll_id: number;
    text: string;
    is_correct: boolean | null;
    votes_count: number;
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

