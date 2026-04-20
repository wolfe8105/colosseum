/**
 * THE MODERATOR — DM Types
 * Session 281: Foundation types for Direct Messages.
 */

export interface DMThread {
  thread_id: string;
  other_user_id: string;
  other_username: string;
  other_display_name: string | null;
  last_message: string | null;
  last_at: string;
  unread_count: number;
}

export interface DMMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface DMSendResult {
  ok?: boolean;
  error?: string;
  thread_id?: string;
  message_id?: string;
}
