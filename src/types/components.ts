import { Profile } from "../queries/profile";
import type { Message } from "./models";
import { ChatType } from "./models";

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
    lastSender: Profile,
    lastMessage: Message
}