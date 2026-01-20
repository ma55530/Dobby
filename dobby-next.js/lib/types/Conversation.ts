import { UserProfile } from './UserProfile';
import { Message } from './Message';

export interface Conversation {
  id: string;
  is_group?: boolean;
  group_name?: string;
  group_avatar_url?: string;
  created_at: string;
  updated_at: string;
  participants?: UserProfile[];
  last_message?: Message;
  unread_count?: number;
}
