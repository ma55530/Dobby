import { UserProfile } from './UserProfile';

export type MessageType = 'text' | 'movie_recommendation' | 'show_recommendation' | 'review';

export interface MessageMetadata {
  movie_id?: number;
  show_id?: number;
  item_type?: 'movie' | 'show';
  title?: string;
  poster_path?: string;
  rating?: number;
  year?: string;
  review_author?: string;
  review_content?: string;
  post_id?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: MessageType;
  metadata?: MessageMetadata;
  created_at: string;
  is_read: boolean;
  sender?: UserProfile;
}
