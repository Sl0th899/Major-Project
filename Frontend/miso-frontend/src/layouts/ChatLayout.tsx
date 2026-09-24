import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Conversation } from "../api/types";
import { ApiError } from "../api/errors";
import { ConversationList } from "../components/chat/ConversationList";
import { Button, ButtonLink } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Icon } from "../components/ui/Icon";
import { Logo } from "../components/ui/Logo";
import Miso from "../components/miso/Miso";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useAuth } from "../state/AuthContext";
import { ConversationsProvider, useConversations } from "../state/ConversationsContext";
import { useToast } from "../state/ToastContext";

export interface ChatOutletContext { openNav: () => void }

function Sidebar({ onNavigate, onDelete }: { onNavigate: () => void; onDelete: (c: Conversation) => void }) {
  const { conversations, state, error, reload } = useConversations();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="sidebar__inner">
      <div className="sidebar__top">
        <Logo to="/chat" />
      </div>
      <ButtonLink to="/chat" variant="secondary" className="sidebar__new" icon={<Icon name="plus" size={18} />} onClick={onNavigate}>
        New conversation
      </ButtonLink>

      <div className="sidebar__list">
        {state === "loading" && (
          <div className="skeleton-list" role="status" aria-label="Loading conversations">
            {[0, 1, 2, 3].map((i) => <span key={i} className="skeleton" />)}
          </div>
        )}
        {state === "error" && (
          <div className="sidebar__note" role="alert">
            <p>{error?.message ?? "Couldn't load your conversations."}</p>
            <Button size="sm" variant="secondary" icon={<Icon name="refresh" size={16} />} onClick={reload}>Try again</Button>
          </div>
        )}
        {state === "ready" && conversations.length === 0 && (
          <div className="sidebar__empty">
            <Miso mood="sleepy" size={84} animated={false} decorative />
            <p>No conversations yet. Your first one will appear here.</p>
          </div>
        )}
        {state === "ready" && conversations.length > 0 && (
          <ConversationList conversations={conversations} onDelete={onDelete} onNavigate={onNavigate} />
        )}
      </div>

      <div className="sidebar__account">
        <span className="sidebar__email">Anonymous session</span>
        <Button variant="ghost" size="sm" loading={signingOut} icon={<Icon name="logout" size={17} />}
          onClick={async () => { setSigningOut(true); await logout(); }}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { remove } = useConversations();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: activeId } = useParams();
  const online = useOnlineStatus();

  useEffect(() => { setNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await remove(pendingDelete.id);
      notify("Conversation deleted", "success");
      if (pendingDelete.id === activeId) navigate("/chat", { replace: true });
      setPendingDelete(null);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't delete that conversation.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="chat-shell">
      {!online && <div className="offline-bar" role="status">You're offline. Reconnect to keep talking with Miso.</div>}
      <aside className={`sidebar${navOpen ? " is-open" : ""}`} aria-label="Conversations and account">
        <button type="button" className="sidebar__close icon-btn" onClick={closeNav} aria-label="Close menu"><Icon name="close" /></button>
        <Sidebar onNavigate={closeNav} onDelete={setPendingDelete} />
      </aside>
      {navOpen && <div className="scrim" onClick={closeNav} aria-hidden="true" />}
      <main className="chat-main" id="main">
        <Outlet context={{ openNav } satisfies ChatOutletContext} />
      </main>

      <Dialog open={!!pendingDelete} title="Delete this conversation?" onClose={() => !deleting && setPendingDelete(null)}
        actions={<>
          <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>Keep it</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>Delete conversation</Button>
        </>}>
        <p>“{pendingDelete?.title}” and all of its messages will be permanently removed. This can't be undone.</p>
      </Dialog>
    </div>
  );
}

export default function ChatLayout() {
  return <ConversationsProvider><Shell /></ConversationsProvider>;
}
