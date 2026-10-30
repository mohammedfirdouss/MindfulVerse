import { track } from "@mindfulverse/core/analytics";
import {
  answerFollowUp,
  dueFollowUp,
  loadFollowUpState,
  saveFollowUpState,
  skipFollowUp,
} from "@mindfulverse/core/followUps";
import type { DueFollowUp, FollowUpAnswer } from "@mindfulverse/core/followUps";
import { getEntries, JOURNAL_SAVED_EVENT } from "@mindfulverse/core/journal";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import { useEffect, useId, useRef, useState } from "react";

import "./follow-up.css";

const ANSWERS: FollowUpAnswer[] = ["Yes", "Partly", "Not yet"];
const ACK_HOLD_MS = 2400;
const ACK_FADE_MS = 600;

type Phase = "ask" | "note" | "kept" | "gone";

export default function FollowUpCard({
  surahNames,
}: {
  surahNames: Map<number, string>;
}) {
  const [due, setDue] = useState<DueFollowUp | null>(() =>
    dueFollowUp(getEntries(), new Date(), loadFollowUpState())
  );
  const [phase, setPhase] = useState<Phase>("ask");
  const phaseRef = useRef<Phase>("ask");
  phaseRef.current = phase;
  const keptRef = useRef<HTMLParagraphElement>(null);
  const [answer, setAnswer] = useState<FollowUpAnswer | null>(null);
  const [note, setNote] = useState("");
  const [fading, setFading] = useState(false);
  const noteId = useId();
  const shown = useRef(new Set<string>());
  const verseKey = due?.verseKey;

  useEffect(() => {
    if (verseKey && !shown.current.has(verseKey)) {
      shown.current.add(verseKey);
      track({ type: "followup_shown", verseKey });
    }
  }, [verseKey]);

  // Entries can arrive after first render (cold-load sync, another device):
  // while still asking, re-pick what is due. Never mid-note or after answering.
  useEffect(() => {
    function recheck() {
      if (phaseRef.current !== "ask") {
        return;
      }
      const next = dueFollowUp(getEntries(), new Date(), loadFollowUpState());
      setDue((prev) => (prev?.entry.id === next?.entry.id ? prev : next));
    }
    const off = onSyncStatus((s) => {
      if (s === "synced") {
        recheck();
      }
    });
    window.addEventListener(JOURNAL_SAVED_EVENT, recheck);
    return () => {
      off();
      window.removeEventListener(JOURNAL_SAVED_EVENT, recheck);
    };
  }, []);

  useEffect(() => {
    if (phase === "kept") {
      keptRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "kept") {
      return;
    }
    const hold = window.setTimeout(() => setFading(true), ACK_HOLD_MS);
    const done = window.setTimeout(
      () => setPhase("gone"),
      ACK_HOLD_MS + ACK_FADE_MS
    );
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(done);
    };
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
    // Answered or deleted elsewhere since this card was picked: write nothing.
    const entries = getEntries();
    const stillOpen =
      entries.some((e) => e.id === due.entry.id) &&
      !entries.some(
        (e) => e.context?.kind === "followup" && e.context.ref === due.entry.id
      );
    if (!stillOpen) {
      setPhase("gone");
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

  return (
    <section
      aria-label="Follow-up"
      className={`card followup${phase === "kept" ? "" : " fade-rise"}${fading ? " leaving" : ""}`}
    >
      <p aria-live="polite" className="followup-sr">
        {phase === "kept" ? "Kept. May it stay with you." : ""}
      </p>
      {phase === "kept" ? (
        <p
          ref={keptRef}
          tabIndex={-1}
          aria-hidden="true"
          className="soft"
          style={{ margin: 0, outline: "none" }}
        >
          Kept. May it stay with you.
        </p>
      ) : (
        <>
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => finish(note)}
                >
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
        </>
      )}
    </section>
  );
}
