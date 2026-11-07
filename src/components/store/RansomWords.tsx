import { Fragment } from "react";

/**
 * A headline cut out word by word like a ransom note (`.ransom` in globals.css). The words keep
 * the spaces between them, so the heading still reads as a sentence to screen readers and search
 * engines; the flex layout of `.ransom` doesn't show them.
 */
export default function RansomWords({ text }: { text: string }) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (
      <Fragment key={i}>
        {i > 0 && " "}
        <span className="ransom-word">{word}</span>
      </Fragment>
    ));
}
