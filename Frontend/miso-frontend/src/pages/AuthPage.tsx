import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/errors";
import Miso, { type MisoMood } from "../components/miso/Miso";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { TextField } from "../components/ui/TextField";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAuth } from "../state/AuthContext";

export default function AuthPage() {
  useDocumentTitle("Connect to Miso");
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const mood: MisoMood = error ? "sad" : apiKey ? "listening" : "neutral";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const key = apiKey.trim();
    if (!key) { setError("Enter your provider API key."); keyRef.current?.focus(); return; }
    setSubmitting(true);
    setError(null);
    try {
      await login(key, remember);
      navigate(from?.startsWith("/chat") ? from : "/chat", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect to Miso's backend.");
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth__art" aria-hidden="true"><div className="auth__art-inner"><Miso mood={mood} size={260} decorative /><p className="auth__quote">Bring a provider key. Miso will keep the conversation here.</p></div></aside>
      <main className="auth__panel"><div className="auth__logo"><Logo /></div><div className="auth__form-wrap">
        <div className="auth__mobile-cat" aria-hidden="true"><Miso mood={mood} size={96} variant="head" decorative /></div>
        <h1 className="auth__title">Connect to Miso</h1>
        <p className="auth__lead">Your key is sent only to the local backend to create an anonymous chat session.</p>
        {sessionExpired && <div className="notice notice--info" role="status">Your session ended. Connect again to continue.</div>}
        {error && <div className="notice notice--error" role="alert">{error}</div>}
        <form onSubmit={onSubmit} noValidate className="auth__form">
          <TextField ref={keyRef} label="Provider API key" type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setError(null); }} required />
          <label className="checkbox"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Keep this connection on this device</span></label>
          <Button type="submit" size="lg" loading={submitting} className="auth__submit">Start chatting</Button>
        </form>
        <p className="auth__switch"><Link to="/">Back to home</Link></p>
      </div></main>
    </div>
  );
}
