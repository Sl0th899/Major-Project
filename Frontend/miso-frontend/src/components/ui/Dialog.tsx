import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}

/** Native <dialog> gives us focus trapping, Escape to close and inert background for free. */
export function Dialog({ open, title, children, actions, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog__body">
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        {children && <div className="dialog__content">{children}</div>}
        <div className="dialog__actions">{actions}</div>
      </div>
    </dialog>
  );
}
