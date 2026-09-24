import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../config";
import { ApiError, parseErrorBody } from "./errors";
import type { Guard } from "./guards";

type ValueGetter = () => string | null;
let getApiKey: ValueGetter = () => null;
let getSession: ValueGetter = () => null;
let onUnauthorized: () => void = () => {};

/** Wired up once by AuthProvider. */
export function configureClient(opts: { getApiKey: ValueGetter; getSession: ValueGetter; onUnauthorized: () => void }) {
  getApiKey = opts.getApiKey;
  getSession = opts.getSession;
  onUnauthorized = opts.onUnauthorized;
}

interface RequestOptions<T> {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  auth?: boolean;
  guard?: Guard<T>;
  timeoutMs?: number;
  signal?: AbortSignal;
  apiKey?: string;
}

export async function request<T = void>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const { method = "GET", body, auth = true, guard, timeoutMs = REQUEST_TIMEOUT_MS, signal } = opts;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const apiKey = opts.apiKey ?? (auth ? getApiKey() : null);
  const session = auth ? getSession() : null;
  if (apiKey) headers["X-Provider-API-Key"] = apiKey;
  if (session) headers["X-Anonymous-Session"] = session;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // caller cancelled; nothing to surface
    const error = timedOut
      ? new ApiError({ kind: "timeout", code: "TIMEOUT", message: "This is taking longer than expected. Please try again." })
      : new ApiError({ kind: "network", code: "NETWORK", message: "Can't reach Miso's server. Check your connection, or make sure the backend is running.", debug: err });
    logDev(method, path, error);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  const data = await readJson(response);

  if (!response.ok) {
    const { code, message } = parseErrorBody(response.status, data);
    const error = new ApiError({ kind: "http", status: response.status, code, message, debug: data });
    logDev(method, path, error);
    if ((response.status === 401 || response.status === 404) && session) onUnauthorized();
    throw error;
  }

  if (response.status === 204 || !guard) return undefined as T;
  if (!guard(data)) {
    const error = new ApiError({ kind: "invalid_response", code: "INVALID_RESPONSE", message: "The server sent something unexpected. Please try again.", debug: data });
    logDev(method, path, error);
    throw error;
  }
  return data;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Developer diagnostics. Never logs tokens or message content. */
function logDev(method: string, path: string, error: ApiError) {
  if (!import.meta.env.DEV) return;
  console.warn(`[api] ${method} ${path} failed`, { kind: error.kind, status: error.status, code: error.code, body: error.kind === "http" ? error.debug : undefined });
}
