import { TITLE_MAX_LENGTH } from "../config";
import type { Conversation } from "../api/types";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

export function daysAgo(iso: string, now = new Date()): number {
  return Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday", "Monday", or "12 Sep 2026". */
export function formatDay(iso: string, now = new Date()): string {
  const diff = daysAgo(iso, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(iso);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Short stamp for the conversation list. */
export function formatRelative(iso: string, now = new Date()): string {
  const diff = daysAgo(iso, now);
  if (diff === 0) return formatTime(iso);
  return formatDay(iso, now);
}

export interface ConversationGroup { label: string; items: Conversation[] }

export function groupConversations(items: Conversation[], now = new Date()): ConversationGroup[] {
  const buckets: [string, (d: number) => boolean][] = [
    ["Today", (d) => d <= 0],
    ["Yesterday", (d) => d === 1],
    ["Earlier this week", (d) => d > 1 && d < 7],
    ["Older", (d) => d >= 7],
  ];
  return buckets
    .map(([label, test]) => ({ label, items: items.filter((c) => test(daysAgo(c.updated_at, now))) }))
    .filter((g) => g.items.length > 0);
}

/** The backend never names conversations, so we title them from the opening message. */
export function titleFromMessage(content: string, max = 60): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  const limit = Math.min(max, TITLE_MAX_LENGTH);
  if (oneLine.length <= limit) return oneLine;
  const cut = oneLine.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
