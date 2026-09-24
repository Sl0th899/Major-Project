import { NavLink } from "react-router-dom";
import type { Conversation } from "../../api/types";
import { formatRelative, groupConversations } from "../../utils/format";
import { Icon } from "../ui/Icon";

interface Props {
  conversations: Conversation[];
  onDelete: (c: Conversation) => void;
  onNavigate?: () => void;
}

export function ConversationList({ conversations, onDelete, onNavigate }: Props) {
  const groups = groupConversations(conversations);
  return (
    <nav className="convos" aria-label="Your conversations">
      {groups.map((g) => (
        <section key={g.label} className="convos__group">
          <h3 className="convos__label">{g.label}</h3>
          <ul>
            {g.items.map((c) => (
              <li key={c.id} className="convos__item">
                <NavLink to={`/chat/${c.id}`} className="convos__link" onClick={onNavigate}>
                  <span className="convos__title">{c.title}</span>
                  <time className="convos__time" dateTime={c.updated_at}>{formatRelative(c.updated_at)}</time>
                </NavLink>
                <button type="button" className="convos__delete" onClick={() => onDelete(c)} aria-label={`Delete conversation: ${c.title}`}>
                  <Icon name="trash" size={17} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
