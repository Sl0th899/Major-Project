import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { FullPageLoader } from "../components/ui/FullPageLoader";
import { StatePanel } from "../components/ui/StatePanel";
import { Button } from "../components/ui/Button";

function Unreachable() {
  const { retry, logout } = useAuth();
  return (
    <main className="page-center">
      <StatePanel mood="sleepy" title="Miso's server isn't answering" role="alert"
        actions={<><Button onClick={retry}>Try again</Button><Button variant="ghost" onClick={logout}>Sign out</Button></>}>
        <p>We couldn't reach the backend to restore your session. Check that it's running, then try again.</p>
      </StatePanel>
    </main>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "checking") return <FullPageLoader />;
  if (status === "unreachable") return <Unreachable />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "checking") return <FullPageLoader />;
  if (status === "authenticated") return <Navigate to="/chat" replace />;
  return <>{children}</>;
}
