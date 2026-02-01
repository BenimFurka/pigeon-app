import type { Profile } from "$lib/queries/profile";
import type { Message, ChatType } from "$lib/types/models";

export type InputItem = 
  | {
      type: 'text' | 'password' | 'email';
      id: string;
      label: string;
      value?: string;
      placeholder?: string;
      required?: boolean;
      checked?: never;
      options?: never;
    }
  | {
      type: 'select';
      id: string;
      label: string;
      value?: string;
      options: { value: string; label: string }[];
      required?: boolean;
      placeholder?: never;
      checked?: never;
    }
  | {
      type: 'checkbox';
      id: string;
      label: string;
      checked?: boolean;
      required?: boolean;
      value?: never;
      placeholder?: never;
      options?: never;
    };
    
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