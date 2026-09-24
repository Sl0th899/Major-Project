import { useOutletContext } from "react-router-dom";
import type { ChatOutletContext } from "../../layouts/ChatLayout";
import Miso, { type MisoMood } from "../miso/Miso";
import { Icon } from "../ui/Icon";

export function ChatHeader({ mood, status, title }: { mood: MisoMood; status: string; title?: string }) {
  const { openNav } = useOutletContext<ChatOutletContext>();
  return (
    <header className="chat-header">
      <button type="button" className="icon-btn chat-header__menu" onClick={openNav} aria-label="Open conversations">
        <Icon name="menu" />
      </button>
      <div className="chat-header__cat">
        <Miso variant="head" mood={mood} size={46} decorative />
        <div>
          <p className="chat-header__name">Miso</p>
          <p className="chat-header__status" aria-live="polite">{status}</p>
        </div>
      </div>
      {title && <h1 className="chat-header__title" title={title}>{title}</h1>}
    </header>
  );
}

export function CareNote() {
  return (
    <p className="care-note">
      Miso is an AI companion, not a licensed therapist. If you're in danger or thinking about harming yourself, contact local emergency services or someone you trust now.
    </p>
  );
}
