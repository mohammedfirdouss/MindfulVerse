import { track } from "@mindfulverse/core/analytics";
import {
  answerFollowUp,
  dueFollowUp,
  loadFollowUpState,
  saveFollowUpState,
  skipFollowUp,
} from "@mindfulverse/core/followUps";
import type { DueFollowUp, FollowUpAnswer } from "@mindfulverse/core/followUps";
import { getEntries } from "@mindfulverse/core/journal";
import { useEffect, useId, useRef, useState } from "react";

import "./follow-up.css";

const ANSWERS: FollowUpAnswer[] = ["Yes", "Partly", "Not yet"];
const ACK_MS = 2600;

type Phase = "ask" | "note" | "kept" | "gone";

export default function FollowUpCard({
  surahNames,
}: {
  surahNames: Map<number, string>;
}) {
  const [due] = useState<DueFollowUp | null>(() =>
    dueFollowUp(getEntries(), new Date(), loadFollowUpState())
  );
  const [phase, setPhase] = useState<Phase>("ask");
  const [answer, setAnswer] = useState<FollowUpAnswer | null>(null);
  const [note, setNote] = useState("");
  const noteId = useId();
  const shown = useRef(false);
  const verseKey = due?.verseKey;

  useEffect(() => {
    if (verseKey && !shown.current) {
      shown.current = true;
      track({ type: "followup_shown", verseKey });
    }
  }, [verseKey]);

  useEffect(() => {
    if (phase !== "kept") {
      return;
    }
    const id = window.setTimeout(() => setPhase("gone"), ACK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (!due || phase === "gone") {
    return null;
  }

  const surahNumber = Number(due.verseKey.split(":")[0]);
  const surahName = surahNames.get(surahNumber);
  const heading = surahName ? `${surahName} ${due.verseKey}` : due.verseKey;

  function skip() {
    if (!due) {
      return;
    }
    const now = new Date();
    saveFollowUpState(skipFollowUp(loadFollowUpState(), due.entry.id, now));
    track({ type: "followup_skipped" });
    setPhase("gone");
  }

  function finish(text: string) {
    if (!due || !answer) {
      return;
    }
    const next = answerFollowUp(
      due,
      answer,
      text,
      new Date(),
      loadFollowUpState()
    );
    saveFollowUpState(next);
    track({ type: "followup_answered", answer });
    setPhase("kept");
  }

  if (phase === "kept") {
    return (
      <section
        aria-label="Follow-up"
        aria-live="polite"
        className="card followup leaving"
      >
        <p className="soft" style={{ margin: 0 }}>
          Kept. May it stay with you.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Follow-up" className="card followup fade-rise">
      <p className="eyebrow">A week on</p>
      <h2 className="followup-title">{heading}</h2>
      <p className="soft" style={{ margin: "0 0 4px" }}>
        You wrote:
      </p>
      <p className="followup-quote">“{due.action}”</p>

      {phase === "ask" ? (
        <>
          <div className="followup-answers">
            {ANSWERS.map((a) => (
              <button
                key={a}
                type="button"
                className="btn secondary"
                onClick={() => {
                  setAnswer(a);
                  setPhase("note");
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="followup-quiet">
            <button type="button" className="btn ghost" onClick={skip}>
              Skip for now
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="soft" style={{ margin: "0 0 8px" }}>
            {answer}
          </p>
          <label className="field" htmlFor={noteId}>
            <span className="field-label">Anything to add? (optional)</span>
            <textarea
              id={noteId}
              className="field-input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="followup-actions">
            <button type="button" className="btn" onClick={() => finish(note)}>
              Save
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => finish("")}
            >
              Skip
            </button>
          </div>
        </>
      )}
    </section>
  );
}
