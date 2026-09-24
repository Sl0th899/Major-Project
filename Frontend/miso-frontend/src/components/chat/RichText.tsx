import { Fragment, memo } from "react";
import { parseRichText, type Inline } from "../../utils/richText";

const InlineRun = ({ parts }: { parts: Inline[] }) => (
  <>{parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <Fragment key={i}>{p.text}</Fragment>))}</>
);

/** Renders assistant text as React elements only (no innerHTML). */
export const RichText = memo(function RichText({ text }: { text: string }) {
  const blocks = parseRichText(text);
  return (
    <div className="rich">
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i}>
              {b.lines.map((line, j) => (
                <Fragment key={j}>{j > 0 && <br />}<InlineRun parts={line} /></Fragment>
              ))}
            </p>
          );
        }
        const List = b.type;
        return <List key={i}>{b.items.map((item, j) => <li key={j}><InlineRun parts={item} /></li>)}</List>;
      })}
    </div>
  );
});
