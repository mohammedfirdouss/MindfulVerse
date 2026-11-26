import {
  PART_ORDER,
  parseTadabburBody,
  TADABBUR_LABELS,
} from "@mindfulverse/core/tadabburBody";
import type { TadabburParts } from "@mindfulverse/core/tadabburBody";

import "../pages/surah-journal.css";

/** Every labelled part that has text, in the order bodies are written. Walks
 *  the whole PART_ORDER so no saved part, old or new, is ever left out. */
export function PartList({ parts }: { parts: TadabburParts }) {
  return (
    <>
      {PART_ORDER.map((key) =>
        parts[key] ? (
          <p key={key} className="sj-part">
            <span className="sj-label">{TADABBUR_LABELS[key]}</span>
            {parts[key]}
          </p>
        ) : null
      )}
    </>
  );
}

/** A journal entry's text: labelled parts (Feeling, Takeaway…) when it was
 *  written that way, otherwise the text as written. Same on every page. */
export default function EntryBody({ body }: { body: string }) {
  const parts = parseTadabburBody(body);
  if (!parts) {
    return <p className="sj-part">{body}</p>;
  }
  return <PartList parts={parts} />;
}
