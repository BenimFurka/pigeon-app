import { ChatType } from "./enums";

export interface InputItem {
    id?: string;
    label?: string;
    placeholder?: string;
    type: string;
    required?: boolean;
    value?: string;
}

export interface TabItem {
    id: string;
    text: string;
    active: boolean;
}

export interface ChatItem {
    type: ChatType,
    name: string,
    lastSender: User,
    lastMessage: Message
}