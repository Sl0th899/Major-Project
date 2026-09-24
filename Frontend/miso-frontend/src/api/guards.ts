import type { AnonymousSession, ChatResponse, Conversation, Message } from "./types";

/** Runtime checks so an unexpected backend payload fails loudly instead of crashing the UI. */
export type Guard<T> = (value: unknown) => value is T;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isDate = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));

export const isAnonymousSession: Guard<AnonymousSession> = (v): v is AnonymousSession =>
  isRecord(v) && isString(v.session_id) && isDate(v.expires_at);

export const isConversation: Guard<Conversation> = (v): v is Conversation =>
  isRecord(v) && isString(v.id) && isString(v.title) && isDate(v.created_at) && isDate(v.updated_at);

export const isMessage: Guard<Message> = (v): v is Message =>
  isRecord(v) && isString(v.id) && isString(v.conversation_id) &&
  (v.role === "user" || v.role === "assistant") && isString(v.content) && isDate(v.created_at);

export const isChatResponse: Guard<ChatResponse> = (v): v is ChatResponse =>
  isRecord(v) && isMessage(v.user_message) && isMessage(v.assistant_message);

export const isHealth: Guard<{ status: string }> = (v): v is { status: string } => isRecord(v) && v.status === "ok";

export const arrayOf = <T,>(guard: Guard<T>): Guard<T[]> => (v): v is T[] => Array.isArray(v) && v.every(guard);
