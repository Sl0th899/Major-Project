import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CareNote, ChatHeader } from "../components/chat/ChatHeader";
import { Composer } from "../components/chat/Composer";
import { MessageList } from "../components/chat/MessageList";
import { Button, ButtonLink } from "../components/ui/Button";
import { StatePanel } from "../components/ui/StatePanel";
import type { MisoMood } from "../components/miso/Miso";
import { useChat } from "../hooks/useChat";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useConversations } from "../state/ConversationsContext";

/** Keyed by id so every conversation gets fresh local state (composer text, moods). */
export default function ConversationRoute() {
  const { id = "" } = useParams();
  return <ConversationPage key={id} id={id} />;
}

function ConversationPage({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { conversations, touch } = useConversations();
  const conversation = conversations.find((c) => c.id === id);
  useDocumentTitle(conversation?.title ?? "Conversation");

  const [justReplied, setJustReplied] = useState(false);
  const [typing, setTyping] = useState(false);
  const [restore, setRestore] = useState<{ text: string; nonce: number } | null>(null);

  const onReply = useCallback((reply: { created_at: string }) => {
    touch(id, reply.created_at);
    setJustReplied(true);
  }, [id, touch]);

  const { messages, loadState, loadError, sending, failure, send, reload, dismissFailure } = useChat(id, { onReply });

  useEffect(() => {
    if (!justReplied) return;
    const t = window.setTimeout(() => setJustReplied(false), 2800);
    return () => window.clearTimeout(t);
  }, [justReplied]);

  // If the message never reached the server, give the text back so nothing is lost.
  useEffect(() => {
    if (failure && !failure.saved) setRestore({ text: failure.content, nonce: Date.now() });
  }, [failure]);

  // First message handed over from the new-conversation screen. Sent once.
  const initial = (location.state as { initialMessage?: string } | null)?.initialMessage;
  const sentInitial = useRef<string | null>(null);
  useEffect(() => {
    if (loadState !== "ready" || !initial || sentInitial.current === id) return;
    sentInitial.current = id;
    navigate(location.pathname, { replace: true, state: null });
    void send(initial);
  }, [loadState, initial, id, send, navigate, location.pathname]);

  if (loadState === "notfound") {
    return (
      <div className="chat-page">
        <ChatHeader mood="sleepy" status="Here with you" />
        <div className="chat-scroll page-center">
          <StatePanel mood="sleepy" title="This conversation isn't here" actions={<ButtonLink to="/chat">Start a new one</ButtonLink>}>
            <p>It may have been deleted, or the link is from another account.</p>
          </StatePanel>
        </div>
      </div>
    );
  }

  const mood: MisoMood = failure ? "sad" : sending ? "listening" : justReplied ? "happy" : typing ? "listening" : loadState === "error" ? "fearful" : "neutral";
  const status = failure ? "Couldn't reply" : sending ? "Thinking it over…" : typing ? "Listening" : "Here with you";

  const failureBanner = failure && (
    <div className="send-failure" role="alert">
      <p>
        <strong>{failure.message}</strong>{" "}
        {failure.saved
          ? "Your message is saved. Trying again sends it once more."
          : "Your message wasn't sent, so it's back in the box below."}
      </p>
      <div className="send-failure__actions">
        {failure.saved && <Button size="sm" onClick={() => send(failure.content)} disabled={sending || !online}>Try again</Button>}
        <Button size="sm" variant="ghost" onClick={dismissFailure}>Dismiss</Button>
      </div>
    </div>
  );

  return (
    <div className="chat-page">
      <ChatHeader mood={mood} status={status} title={conversation?.title} />
      <div className="chat-scroll">
        {loadState === "loading" && (
          <div className="thread-loading" role="status" aria-label="Loading messages">
            <span className="skeleton skeleton--cat" /><span className="skeleton skeleton--user" /><span className="skeleton skeleton--cat" />
          </div>
        )}
        {loadState === "error" && (
          <StatePanel mood="fearful" title="Couldn't load this conversation" role="alert" actions={<Button onClick={reload}>Try again</Button>}>
            <p>{loadError?.message ?? "Something went wrong."}</p>
          </StatePanel>
        )}
        {loadState === "ready" && messages.length === 0 && !sending && !initial && (
          <StatePanel mood="neutral" title="Nothing here yet" size={130}>
            <p>Say hello, or start with whatever's been sitting with you.</p>
          </StatePanel>
        )}
        {loadState === "ready" && (messages.length > 0 || sending) && (
          <MessageList messages={messages} thinking={sending} footer={failureBanner} />
        )}
        {loadState === "ready" && messages.length === 0 && failureBanner}
      </div>
      <div className="chat-bottom">
        <Composer onSend={send} busy={sending} disabled={!online || loadState !== "ready"}
          disabledReason={!online ? "You're offline" : "Loading…"} autoFocus restore={restore} onTypingChange={setTyping}
          placeholder="Write to Miso…" />
        <CareNote />
      </div>
    </div>
  );
}
