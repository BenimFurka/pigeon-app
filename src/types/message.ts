import { read } from "fs";

export class Message {
    id: number;
    sender_id: number;
    reply_to: number | null; 
    content: string;
    is_edited: boolean;
    timestamp: Date;
    edited_at: Date | null;
    is_read: boolean | null;

    constructor() {
        this.id = 42;
        this.sender_id = 42;
        this.reply_to = null;
        this.content = '';
        this.is_edited = false;
        this.timestamp = new Date();
        this.edited_at = null;
        this.is_read = false;
    }
}