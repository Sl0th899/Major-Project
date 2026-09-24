const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!rawBaseUrl && import.meta.env.DEV) {
  console.warn("[config] VITE_API_BASE_URL is not set; falling back to http://localhost:8000. Copy .env.example to .env.");
}

/** Backend origin, e.g. http://localhost:8000. The only place a URL default lives. */
export const API_BASE_URL = (rawBaseUrl || "http://localhost:8000").replace(/\/+$/, "");
/** Ordinary requests. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** Chat replies wait on the AI provider (backend timeout is 20s by default). */
export const CHAT_TIMEOUT_MS = 45_000;
/** Mirrors backend validation. */
export const MESSAGE_MAX_LENGTH = 4000;
export const TITLE_MAX_LENGTH = 120;
