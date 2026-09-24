import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

interface Common { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode; className?: string }

const cls = ({ variant = "primary", size = "md", className }: Common, extra = "") =>
  ["btn", `btn--${variant}`, `btn--${size}`, extra, className].filter(Boolean).join(" ");

export const Button = forwardRef<HTMLButtonElement, Common & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant, size, loading, icon, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={cls({ variant, size, className }, loading ? "is-loading" : "")}
        disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
        {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon}
        {children && <span>{children}</span>}
      </button>
    );
  },
);

export function ButtonLink({ variant, size, icon, className, children, ...rest }: Common & LinkProps) {
  return (
    <Link className={cls({ variant, size, className })} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
