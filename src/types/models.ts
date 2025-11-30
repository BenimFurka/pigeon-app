export interface ApiError {
    code: number;
    message: string;
}

export interface ApiResponse<T = any> {
    data?: T;
    error?: ApiError;
}

export interface User {
    id: number;
    username: string;
    name: string;
    email?: string;
    is_bot: boolean;
    bio?: string;
    avatar_url?: string;
    is_verified: boolean;
    is_active: boolean;
    last_seen_at?: string;
    created_at: string;
    updated_at: string;
}

export interface UserPublic {
    id: number;
    username: string;
    name: string;
    is_bot: boolean;
    bio?: string;
    avatar_url?: string;
    is_verified: boolean;
    last_seen_at?: string;
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
    name?: string;
    description?: string;
    avatar_url?: string;
    owner_id?: number;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChatMember {
    chat_id: number;
    user_id: number;
    role: string;
    custom_nickname?: string;
    can_send_messages: boolean;
    can_manage_messages: boolean;
    can_manage_members: boolean;
    can_manage_chat: boolean;
    joined_at: string;
    last_read_message_id?: number;
}

export interface MessageAttachment {
    id: number;
    message_id: number;
    file_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration?: number;
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
    reply_to_message_id?: number;
    content: string;
    is_edited: boolean;
    created_at: string;
    edited_at?: string;
    attachments?: MessageAttachment[];
    reactions?: MessageReaction[];
}

export interface Poll {
    id: number;
    chat_id: number;
    message_id?: number;
    question: string;
    allows_multiple: boolean;
    anonymous: boolean;
    is_quiz: boolean;
    explanation?: string;
    is_closed: boolean;
    created_at: string;
}

export interface PollOption {
    id: number;
    poll_id: number;
    text: string;
    is_correct?: boolean;
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
    max_uses?: number;
    uses_count: number;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
}

