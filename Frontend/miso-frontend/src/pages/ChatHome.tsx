import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/errors";
import { CareNote, ChatHeader } from "../components/chat/ChatHeader";
import { Composer } from "../components/chat/Composer";
import Miso from "../components/miso/Miso";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useConversations } from "../state/ConversationsContext";
import { titleFromMessage } from "../utils/format";

const STARTERS = [
  "I've had a really long day",
  "I can't stop overthinking something",
  "I just need to vent for a minute",
  "Help me slow down and breathe",
];

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up?" : h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
}

/** A fresh conversation. It's created on the backend only once the first message is sent. */
export default function ChatHome() {
  useDocumentTitle("New conversation");
  const { create } = useConversations();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restore, setRestore] = useState<{ text: string; nonce: number } | null>(null);

  const start = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return false;
    setBusy(true);
    setError(null);
    try {
      const conversation = await create(titleFromMessage(content));
      navigate(`/chat/${conversation.id}`, { state: { initialMessage: content } });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start a conversation. Please try again.");
      setRestore({ text: content, nonce: Date.now() });
      setBusy(false);
      return false;
    }
  };

  const mood = error ? "sad" : busy || typing ? "listening" : "neutral";

  return (
    <div className="chat-page">
      <ChatHeader mood={mood} status={busy ? "Getting comfortable…" : typing ? "Listening" : "Here with you"} />
      <div className="chat-scroll">
        <section className="welcome">
          <div className="welcome__window" aria-hidden="true">
            <Miso mood={mood} size={190} decorative />
          </div>
          <h1 className="welcome__title">{greeting()}</h1>
          <p className="welcome__text">
            What's on your mind? Big or small, tidy or tangled, you can start anywhere.
          </p>
          <div className="starters" role="group" aria-label="Conversation starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" className="starter" onClick={() => start(s)} disabled={busy || !online}>{s}</button>
            ))}
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
        </section>
      </div>
      <div className="chat-bottom">
        <Composer onSend={start} busy={busy} disabled={!online} disabledReason="You're offline" autoFocus restore={restore} onTypingChange={setTyping} />
        <CareNote />
      </div>
    </div>
  );
}
