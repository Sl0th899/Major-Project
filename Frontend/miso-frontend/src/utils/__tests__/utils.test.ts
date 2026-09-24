import { describe, expect, it } from "vitest";
import { parseErrorBody } from "../../api/errors";
import { arrayOf, isChatResponse, isMessage } from "../../api/guards";
import { groupConversations, titleFromMessage } from "../format";
import { parseRichText } from "../richText";

describe("parseErrorBody", () => {
  it("reads the app's {detail:{code,message}} shape", () => {
    expect(parseErrorBody(503, { detail: { code: "AI_UNAVAILABLE", message: "The cat is unavailable right now." } }))
      .toEqual({ code: "AI_UNAVAILABLE", message: "The cat is unavailable right now." });
  });
  it("reads Pydantic 422 arrays", () => {
    const r = parseErrorBody(422, { detail: [{ msg: "Value error, enter a valid email address", loc: ["body", "email"] }] });
    expect(r).toEqual({ code: "VALIDATION_ERROR", message: "Enter a valid email address." });
  });
  it("falls back for plain strings and junk", () => {
    expect(parseErrorBody(404, { detail: "session not found" }).code).toBe("HTTP_404");
    expect(parseErrorBody(500, "<html>").message).toMatch(/server/);
  });
});

describe("guards", () => {
  const msg = { id: "1", conversation_id: "c", role: "assistant", content: "hi", created_at: "2026-09-23T10:00:00+00:00" };
  it("accepts backend messages and rejects malformed ones", () => {
    expect(isMessage(msg)).toBe(true);
    expect(isMessage({ ...msg, role: "system" })).toBe(false);
    expect(arrayOf(isMessage)([msg, { ...msg, created_at: "nope" }])).toBe(false);
    expect(isChatResponse({ user_message: { ...msg, role: "user" }, assistant_message: msg })).toBe(true);
  });
});

describe("richText", () => {
  it("splits paragraphs, lists and bold without HTML", () => {
    const blocks = parseRichText("Hello there.\nSecond line.\n\n- one\n- **two**\n\n1. first\n2. second");
    expect(blocks.map((b) => b.type)).toEqual(["p", "ul", "ol"]);
    expect(blocks[0].type === "p" && blocks[0].lines.length).toBe(2);
    expect(blocks[1].type === "ul" && blocks[1].items[1][0]).toEqual({ text: "two", bold: true });
  });
  it("leaves markup-looking text as text", () => {
    const [b] = parseRichText("<img src=x onerror=alert(1)>");
    expect(b.type === "p" && b.lines[0][0].text).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("format", () => {
  it("titles from the first message, trimmed on a word", () => {
    expect(titleFromMessage("  I can't   sleep  ")).toBe("I can't sleep");
    const long = titleFromMessage("I have been thinking a lot about my exams and whether I am prepared enough for them");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
  });
  it("groups conversations by recency", () => {
    const now = new Date("2026-09-23T12:00:00");
    const c = (id: string, updated_at: string) => ({ id, title: id, created_at: updated_at, updated_at });
    const groups = groupConversations([c("a", "2026-09-23T09:00:00"), c("b", "2026-09-22T09:00:00"), c("d", "2026-08-01T09:00:00")], now);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Older"]);
  });
});
