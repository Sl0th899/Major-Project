import { memo, useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage } from "../../hooks/useChat";
import { formatDay, formatTime } from "../../utils/format";
import Miso from "../miso/Miso";
import { RichText } from "./RichText";

interface Props {
  messages: ChatMessage[];
  thinking: boolean;
  footer?: ReactNode;
}

const dayKey = (iso: string) => new Date(iso).toDateString();

const MessageRow = memo(function MessageRow({ m }: { m: ChatMessage }) {
  const time = formatTime(m.created_at);
  if (m.role === "assistant") {
    return (
      <li className="msg msg--cat">
        <Miso variant="head" size={34} animated={false} decorative className="msg__avatar" />
        <div className="msg__body">
          <span className="sr-only">Miso said:</span>
          <div className="msg__bubble"><RichText text={m.content} /></div>
          <time className="msg__time" dateTime={m.created_at}>{time}</time>
        </div>
      </li>
    );
  }
  return (
    <li className={`msg msg--user${m.pending ? " is-pending" : ""}`}>
      <div className="msg__body">
        <span className="sr-only">You said:</span>
        <div className="msg__bubble msg__bubble--user">{m.content}</div>
        <span className="msg__time">{m.pending ? "Sending…" : <time dateTime={m.created_at}>{time}</time>}</span>
      </div>
    </li>
  );
});

export function TypingIndicator() {
  return (
    <li className="msg msg--cat msg--typing" aria-live="polite">
      <Miso variant="head" mood="listening" size={34} decorative className="msg__avatar" />
      <div className="typing">
        <span className="typing__dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="typing__label">Miso is thinking it over</span>
      </div>
    </li>
  );
}

export function MessageList({ messages, thinking, footer }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const hasFooter = Boolean(footer);
  const first = useRef(true);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: first.current ? "auto" : "smooth", block: "end" });
    first.current = false;
  }, [messages.length, thinking, hasFooter]);

  const rows: ReactNode[] = [];
  let lastDay = "";
  for (const m of messages) {
    const key = dayKey(m.created_at);
    if (key !== lastDay) {
      rows.push(<li key={`day-${key}`} className="day-sep" aria-hidden="true"><span>{formatDay(m.created_at)}</span></li>);
      lastDay = key;
    }
    rows.push(<MessageRow key={m.id} m={m} />);
  }

  return (
    <div className="thread">
      <ol className="thread__list" aria-label="Conversation">
        {rows}
        {thinking && <TypingIndicator />}
      </ol>
      {footer}
      <div ref={endRef} />
    </div>
  );
}
