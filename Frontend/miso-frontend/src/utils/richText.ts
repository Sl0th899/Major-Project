/**
 * Tiny, safe formatter for assistant replies. It produces a tree of plain data that
 * RichText renders as React elements; nothing is ever injected as HTML.
 * Supports paragraphs, line breaks, bulleted and numbered lists, and **bold**.
 */
export type Inline = { text: string; bold: boolean };
export type Block =
  | { type: "p"; lines: Inline[][] }
  | { type: "ul" | "ol"; items: Inline[][] };

const BULLET = /^\s*(?:[-*•])\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", lines: para.map(parseInline) });
    para = [];
  };

  for (const line of lines) {
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      flushPara();
      const type = bullet ? "ul" : "ol";
      const item = parseInline((bullet ?? numbered)![1]);
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === type) prev.items.push(item);
      else blocks.push({ type, items: [item] });
    } else if (line.trim() === "") {
      flushPara();
    } else {
      para.push(line.trim());
    }
  }
  flushPara();
  return blocks;
}
