import { request } from "./client";
import { isAnonymousSession } from "./guards";

export const sessionApi = {
  create: (apiKey: string) => request("/chat/sessions", { method: "POST", auth: false, apiKey, guard: isAnonymousSession }),
  remove: (sessionId: string) => request(`/chat/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
};