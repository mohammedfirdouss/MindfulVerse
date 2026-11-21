import {
  parseTadabburBody,
  TADABBUR_LABELS,
} from "@mindfulverse/core/tadabburBody";

import "../pages/surah-journal.css";

const PART_KEYS = ["lessons", "reflection", "action", "connections"] as const;

/** A journal entry's text: labelled parts (Lessons, Action…) when it was
 *  written that way, otherwise the text as written. Same on every page. */
export default function EntryBody({ body }: { body: string }) {
  const parts = parseTadabburBody(body);
  if (!parts) {
    return <p className="sj-part">{body}</p>;
  }
  return (
    <>
      {PART_KEYS.map((key) =>
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
