import { UserProfile } from './UserProfile';

export type NotificationType = 'follow' | 'message' | 'like' | 'reply' | 'review_movie' | 'review_show';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  actor?: UserProfile; // The user who triggered the notification
  type: NotificationType;
  resource_id: string;
  content?: string;
  is_read: boolean;
  created_at: string;
}
