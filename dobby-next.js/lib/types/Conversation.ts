import { UserProfile } from './UserProfile';
import { Message } from './Message';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: UserProfile[];
  last_message?: Message;
}
