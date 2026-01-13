export type MessageType = 'text' | 'movie_recommendation' | 'show_recommendation';

export interface MessageMetadata {
  movie_id?: number;
  show_id?: number;
  title?: string;
  poster_path?: string;
  rating?: number;
  year?: string;
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
}
