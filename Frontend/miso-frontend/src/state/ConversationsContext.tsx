import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { conversationsApi } from "../api/conversations";
import { ApiError } from "../api/errors";
import type { Conversation } from "../api/types";

type LoadState = "loading" | "ready" | "error";

interface ConversationsValue {
  conversations: Conversation[];
  state: LoadState;
  error: ApiError | null;
  reload: () => void;
  create: (title?: string) => Promise<Conversation>;
  remove: (id: string) => Promise<void>;
  /** Moves a conversation to the top after activity, without refetching. */
  touch: (id: string, updatedAt: string) => void;
}

const ConversationsContext = createContext<ConversationsValue | null>(null);

const byRecent = (a: Conversation, b: Conversation) => Date.parse(b.updated_at) - Date.parse(a.updated_at);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    conversationsApi.list(controller.signal)
      .then((list) => { setConversations([...list].sort(byRecent)); setError(null); setState("ready"); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err : null);
        setState("error");
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const create = useCallback(async (title?: string) => {
    const conversation = await conversationsApi.create(title);
    setConversations((list) => [conversation, ...list.filter((c) => c.id !== conversation.id)]);
    return conversation;
  }, []);

  const remove = useCallback(async (id: string) => {
    await conversationsApi.remove(id);
    setConversations((list) => list.filter((c) => c.id !== id));
  }, []);

  const touch = useCallback((id: string, updatedAt: string) => {
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, updated_at: updatedAt } : c)).sort(byRecent));
  }, []);

  const value = useMemo(
    () => ({ conversations, state, error, reload, create, remove, touch }),
    [conversations, state, error, reload, create, remove, touch],
  );
  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used inside ConversationsProvider");
  return ctx;
}
