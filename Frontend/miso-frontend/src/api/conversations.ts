import { CHAT_TIMEOUT_MS } from "../config";
import { request } from "./client";
import { arrayOf, isChatResponse, isConversation, isMessage } from "./guards";

const enc = encodeURIComponent;

export const conversationsApi = {
  list: (signal?: AbortSignal) => request("/conversations", { guard: arrayOf(isConversation), signal }),
  create: (title?: string) => request("/conversations", { method: "POST", body: title ? { title } : {}, guard: isConversation }),
  remove: (id: string) => request(`/conversations/${enc(id)}`, { method: "DELETE" }),
  messages: (id: string, signal?: AbortSignal) => request(`/conversations/${enc(id)}/messages`, { guard: arrayOf(isMessage), signal }),
  send: (id: string, content: string) =>
    request(`/conversations/${enc(id)}/messages`, { method: "POST", body: { content }, guard: isChatResponse, timeoutMs: CHAT_TIMEOUT_MS }),
};
