export type ApiErrorKind = "network" | "timeout" | "http" | "invalid_response";

/** One error type for every failed request. `message` is safe to show to users. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code: string;
  readonly debug?: unknown;

  constructor(opts: { kind: ApiErrorKind; message: string; code: string; status?: number; debug?: unknown }) {
    super(opts.message);
    this.name = "ApiError";
    this.kind = opts.kind;
    this.code = opts.code;
    this.status = opts.status;
    this.debug = opts.debug;
  }

  get isUnreachable() {
    return this.kind === "network" || this.kind === "timeout";
  }
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  400: "That request didn't look right. Please check and try again.",
  401: "Please sign in to continue.",
  403: "You don't have access to that.",
  404: "We couldn't find that.",
  409: "That already exists.",
  422: "Some details need another look.",
  429: "Too many requests. Wait a moment and try again.",
  503: "The service is unavailable right now. Please try again shortly.",
};

/**
 * FastAPI error bodies come in three shapes here:
 *  { detail: { code, message } }   the app's own errors
 *  { detail: [{ msg, loc, ... }] } Pydantic validation (422)
 *  { detail: "text" }              plain HTTPException
 */
export function parseErrorBody(status: number, body: unknown): { code: string; message: string } {
  const detail = typeof body === "object" && body !== null ? (body as { detail?: unknown }).detail : undefined;
  const fallback = FALLBACK_BY_STATUS[status] ?? (status >= 500 ? "Something went wrong on the server. Please try again." : "Something went wrong. Please try again.");

  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const { code, message } = detail as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "string" ? code : `HTTP_${status}`,
      message: typeof message === "string" && message ? message : fallback,
    };
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    const msg = typeof first?.msg === "string" ? first.msg.replace(/^Value error,\s*/i, "") : "";
    return { code: "VALIDATION_ERROR", message: msg ? capitalize(msg) + (msg.endsWith(".") ? "" : ".") : fallback };
  }
  return { code: `HTTP_${status}`, message: fallback };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
