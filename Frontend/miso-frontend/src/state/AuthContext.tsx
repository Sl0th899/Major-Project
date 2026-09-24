import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { configureClient } from "../api/client";
import { sessionApi } from "../api/session";

type Status = "checking" | "authenticated" | "anonymous" | "unreachable";
interface AuthValue {
  status: Status;
  sessionExpired: boolean;
  login: (apiKey: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const API_KEY_STORAGE = "miso.providerApiKey";
const SESSION_STORAGE = "miso.anonymousSession";

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiKeyRef = useRef(localStorage.getItem(API_KEY_STORAGE));
  const sessionRef = useRef(localStorage.getItem(SESSION_STORAGE));
  const [status, setStatus] = useState<Status>(apiKeyRef.current && sessionRef.current ? "authenticated" : "anonymous");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [, setAttempt] = useState(0);

  const clearSession = useCallback(() => {
    apiKeyRef.current = null;
    sessionRef.current = null;
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.removeItem(SESSION_STORAGE);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    configureClient({
      getApiKey: () => apiKeyRef.current,
      getSession: () => sessionRef.current,
      onUnauthorized: () => {
        if (sessionRef.current) setSessionExpired(true);
        clearSession();
      },
    });
  }, [clearSession]);

  const login = useCallback(async (apiKey: string, remember: boolean) => {
    const session = await sessionApi.create(apiKey);
    apiKeyRef.current = apiKey;
    sessionRef.current = session.session_id;
    if (remember) {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
      localStorage.setItem(SESSION_STORAGE, session.session_id);
    }
    setSessionExpired(false);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      if (sessionRef.current) await sessionApi.remove(sessionRef.current);
    } catch {
      // Clear local state even when the backend is unavailable.
    } finally {
      clearSession();
      setSessionExpired(false);
    }
  }, [clearSession]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const value = useMemo(() => ({ status, sessionExpired, login, logout, retry }), [status, sessionExpired, login, logout, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
