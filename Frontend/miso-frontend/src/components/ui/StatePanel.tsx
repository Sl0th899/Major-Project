import type { ReactNode } from "react";
import Miso, { type MisoMood } from "../miso/Miso";

interface Props {
  mood: MisoMood;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  size?: number;
  role?: "alert" | "status";
}

/** Shared empty / error / loading layout, always with Miso reacting. */
export function StatePanel({ mood, title, children, actions, size = 150, role }: Props) {
  return (
    <section className="state-panel" role={role}>
      <Miso mood={mood} size={size} decorative />
      <h2 className="state-panel__title">{title}</h2>
      {children && <div className="state-panel__text">{children}</div>}
      {actions && <div className="state-panel__actions">{actions}</div>}
    </section>
  );
}
