import { Link } from "react-router-dom";
import Miso from "../miso/Miso";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="logo" aria-label="Miso, home">
      <Miso variant="head" size={40} animated={false} decorative />
      {!compact && (
        <span className="logo__text">
          <span className="logo__name">Miso</span>
          <span className="logo__tag">cat therapist</span>
        </span>
      )}
    </Link>
  );
}
