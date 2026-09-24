export interface AnonymousSession { session_id: string; expires_at: string }

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  created_at: string;
}

export interface ChatResponse {
  user_message: Message;
  assistant_message: Message;
}
