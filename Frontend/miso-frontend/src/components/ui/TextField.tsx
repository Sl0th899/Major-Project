import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField({ label, hint, error, type = "text", id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error && `${inputId}-error`, hint && `${inputId}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label className="field__label" htmlFor={inputId}>{label}</label>
      <div className="field__control">
        <input ref={ref} id={inputId} type={isPassword && reveal ? "text" : type} className="field__input"
          aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
        {isPassword && (
          <button type="button" className="field__reveal" onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"} aria-pressed={reveal}>
            <Icon name={reveal ? "eyeOff" : "eye"} size={18} />
          </button>
        )}
      </div>
      {error ? <p id={`${inputId}-error`} className="field__error">{error}</p>
        : hint ? <p id={`${inputId}-hint`} className="field__hint">{hint}</p> : null}
    </div>
  );
});
