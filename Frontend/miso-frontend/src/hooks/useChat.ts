import { useCallback, useEffect, useRef, useState } from "react";
import { conversationsApi } from "../api/conversations";
import { ApiError } from "../api/errors";
import type { Message } from "../api/types";

export type ChatMessage = Message & { pending?: boolean };
export type LoadState = "loading" | "ready" | "notfound" | "error";

export interface SendFailure {
  message: string;
  content: string;
  /** True when the backend stored the user's message but produced no reply (e.g. 503). */
  saved: boolean;
}

interface Options {
  onReply?: (reply: Message) => void;
}

/**
 * Loads and sends messages for one conversation.
 *
 * Backend behaviour this hook accounts for: POST /messages stores the user's message
 * *before* calling the AI. If the AI fails (503) or the request times out, the message
 * may already be saved, or even answered. So after any failure we re-read the thread
 * from the server instead of guessing.
 */
export function useChat(conversationId: string, { onReply }: Options = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<SendFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sendingRef = useRef(false);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setFailure(null);
    setMessages([]);
    conversationsApi.messages(conversationId, controller.signal)
      .then((list) => { setMessages(list); setLoadState("ready"); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const apiErr = err instanceof ApiError ? err : null;
        setLoadError(apiErr);
        setLoadState(apiErr?.status === 404 || apiErr?.status === 422 ? "notfound" : "error");
      });
    return () => controller.abort();
  }, [conversationId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const send = useCallback(async (raw: string): Promise<boolean> => {
    const content = raw.trim();
    if (!content || sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setFailure(null);

    const tempId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, conversation_id: conversationId, role: "user", content, created_at: new Date().toISOString(), pending: true,
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await conversationsApi.send(conversationId, content);
      setMessages((m) => [...m.filter((x) => x.id !== tempId), res.user_message, res.assistant_message]);
      onReplyRef.current?.(res.assistant_message);
      return true;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError({ kind: "network", code: "UNKNOWN", message: "Something went wrong. Please try again." });
      if (apiErr.status === 404) {
        setLoadState("notfound");
        return false;
      }
      // Reconcile with what the server actually stored.
      try {
        const list = await conversationsApi.messages(conversationId);
        setMessages(list);
        const last = list[list.length - 1];
        if (last?.role === "assistant" && list.length >= 2 && list[list.length - 2].content === content && Date.parse(last.created_at) >= Date.parse(optimistic.created_at) - 60_000) {
          // The reply landed after our timeout; treat as success.
          onReplyRef.current?.(last);
          return true;
        }
        const saved = last?.role === "user" && last.content === content;
        setFailure({
          content,
          saved,
          message: apiErr.code === "AI_UNAVAILABLE"
            ? "Miso couldn't reply just now."
            : apiErr.message,
        });
      } catch {
        setMessages((m) => m.filter((x) => x.id !== tempId));
        setFailure({ content, saved: false, message: apiErr.message });
      }
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [conversationId]);

  const dismissFailure = useCallback(() => setFailure(null), []);

  return { messages, loadState, loadError, sending, failure, send, reload, dismissFailure };
}
