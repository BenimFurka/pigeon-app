export interface AuthenticateMessage {
    type: 'authenticate';
    data: {
        token: string;
    };
}

export interface SendMessageMessage {
    type: 'send_message';
    data: {
        chat_id: number;
        content: string;
        reply_to?: number;
    };
}

export interface EditMessageMessage {
    type: 'edit_message';
    data: {
        message_id: number;
        content: string;
    };
}

export interface DeleteMessageMessage {
    type: 'delete_message';
    data: {
        message_id: number;
    };
}

export interface AddReactionMessage {
    type: 'add_reaction';
    data: {
        message_id: number;
        emoji: string;
    };
}

export interface RemoveReactionMessage {
    type: 'remove_reaction';
    data: {
        message_id: number;
        emoji: string;
    };
}

export interface TypingMessage {
    type: 'typing';
    data: {
        chat_id: number;
        is_typing: boolean;
    };
}

export interface MarkAsReadMessage {
    type: 'mark_as_read';
    data: {
        chat_id: number;
        message_id: number;
    };
}

export interface PingMessage {
    type: 'ping';
    data?: Record<string, never>;
}

export type ClientMessage =
    | AuthenticateMessage
    | SendMessageMessage
    | EditMessageMessage
    | DeleteMessageMessage
    | AddReactionMessage
    | RemoveReactionMessage
    | TypingMessage
    | MarkAsReadMessage
    | PingMessage;

export interface PongMessage {
    type: 'pong';
    data?: Record<string, never>;
}

export interface AuthenticatedMessage {
    type: 'authenticated';
    data: {
        user_id: number;
    };
}

export interface ErrorMessage {
    type: 'error';
    data: {
        message: string;
    };
}

export interface NewMessageMessage {
    type: 'new_message';
    data: {
        message: import('./models').Message;
    };
}

export interface MessageEditedMessage {
    type: 'message_edited';
    data: {
        message: import('./models').Message;
    };
}

export interface MessageDeletedMessage {
    type: 'message_deleted';
    data: {
        message_id: number;
        chat_id: number;
    };
}

export interface ReactionAddedMessage {
    type: 'reaction_added';
    data: {
        message_id: number;
        reaction: import('./models').MessageReaction;
    };
}

export interface ReactionRemovedMessage {
    type: 'reaction_removed';
    data: {
        message_id: number;
        user_id: number;
        emoji: string;
    };
}

export interface UserOnlineMessage {
    type: 'user_online';
    data: {
        user_id: number;
    };
}

export interface UserOfflineMessage {
    type: 'user_offline';
    data: {
        user_id: number;
    };
}

export interface OnlineListMessage {
    type: 'online_list';
    data: {
        users: number[];
    };
}

export interface UserTypingMessage {
    type: 'user_typing';
    data: {
        chat_id: number;
        user_id: number;
        is_typing: boolean;
    };
}

export interface MessageReadMessage {
    type: 'message_read';
    data: {
        chat_id: number;
        message_id: number;
        reader_id: number;
    };
}

export interface PollCreatedMessage {
    type: 'poll_created';
    data: {
        chat_id: number;
        poll: import('./models').Poll;
        options: import('./models').PollOption[];
    };
}

export interface PollVotedMessage {
    type: 'poll_voted';
    data: {
        chat_id: number;
        poll_id: number;
        option_ids: number[];
        voter_id: number | null;
    };
}

export interface PollClosedMessage {
    type: 'poll_closed';
    data: {
        chat_id: number;
        poll_id: number;
    };
}

export type ServerMessage =
    | PongMessage
    | AuthenticatedMessage
    | ErrorMessage
    | NewMessageMessage
    | MessageEditedMessage
    | MessageDeletedMessage
    | ReactionAddedMessage
    | ReactionRemovedMessage
    | UserOnlineMessage
    | UserOfflineMessage
    | OnlineListMessage
    | UserTypingMessage
    | MessageReadMessage
    | PollCreatedMessage
    | PollVotedMessage
    | PollClosedMessage;

