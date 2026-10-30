import { track } from "@mindfulverse/core/analytics";
import { addEntry, getEntries } from "@mindfulverse/core/journal";
import { surahJournal } from "@mindfulverse/core/surahJournal";
import { useId, useState } from "react";

function currentIntention(surah: number): string | null {
  return surahJournal(getEntries(), surah).intention?.body ?? null;
}

export default function IntentionField({
  surah,
  surahName,
  onSaved,
}: {
  surah: number;
  surahName: string;
  onSaved?: () => void;
}) {
  const [saved, setSaved] = useState<string | null>(() =>
    currentIntention(surah)
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function save() {
    const body = draft.trim();
    if (!body) {
      return;
    }
    addEntry({
      body,
      context: { kind: "intention", ref: String(surah) },
      prompt: `Why I'm reading ${surahName}`,
    });
    track({ type: "journal_save", context: "intention" });
    setSaved(currentIntention(surah));
    setEditing(false);
    onSaved?.();
  }

  if (saved !== null && !editing) {
    return (
      <div className="intention">
        <p className="eyebrow" style={{ margin: 0 }}>
          Why you’re reading this surah
        </p>
        <blockquote className="intention-quote">{saved}</blockquote>
        <button
          type="button"
          className="commentary-open intention-change"
          onClick={() => {
            setDraft(saved);
            setEditing(true);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="intention">
      <label htmlFor={inputId} className="tad-prompt">
        Why are you reading this surah now?
      </label>
      <textarea
        id={inputId}
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="tad-input"
      />
      <div className="intention-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={draft.trim() === ""}
          onClick={save}
        >
          Save
        </button>
        {editing && (
          <button
            type="button"
            className="commentary-open intention-change"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
