import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MESSAGE_MAX_LENGTH } from "../../config";
import { Icon } from "../ui/Icon";

interface Props {
  onSend: (text: string) => Promise<boolean> | boolean;
  busy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Put text back into the box (e.g. after a failed send). */
  restore?: { text: string; nonce: number } | null;
  onTypingChange?: (typing: boolean) => void;
}

const coarsePointer = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

export function Composer({ onSend, busy, disabled, disabledReason, placeholder = "Tell Miso what's on your mind…", autoFocus, restore, onTypingChange }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const remaining = MESSAGE_MAX_LENGTH - text.length;
  const canSend = text.trim().length > 0 && !busy && !disabled;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => { if (autoFocus && !coarsePointer()) ref.current?.focus(); }, [autoFocus]);
  useEffect(() => { if (restore) { setText(restore.text); ref.current?.focus(); } }, [restore]);
  useEffect(() => { onTypingChange?.(text.trim().length > 0); }, [text, onTypingChange]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const value = text;
    setText("");
    const ok = await onSend(value);
    if (ok === false && !restore) ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on keyboards; on touch screens Enter inserts a line break.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !coarsePointer()) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form className={`composer${disabled ? " is-disabled" : ""}`} onSubmit={submit}>
      <label htmlFor="composer-input" className="sr-only">Message to Miso</label>
      <textarea
        id="composer-input" ref={ref} rows={1} value={text} maxLength={MESSAGE_MAX_LENGTH}
        placeholder={disabled && disabledReason ? disabledReason : placeholder}
        onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
        disabled={disabled} aria-describedby="composer-help"
        className="composer__input"
      />
      <div className="composer__row">
        <p id="composer-help" className="composer__help">
          {remaining < 400
            ? <span className={remaining < 50 ? "is-warn" : undefined}>{remaining} characters left</span>
            : <span className="composer__keys">Enter to send, Shift + Enter for a new line</span>}
        </p>
        <button type="submit" className="composer__send" disabled={!canSend} aria-label={busy ? "Waiting for Miso" : "Send message"}>
          {busy ? <span className="btn__spinner" aria-hidden="true" /> : <Icon name="send" size={20} />}
        </button>
      </div>
    </form>
  );
}
