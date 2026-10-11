// The reader's quiet control row: "Aa" opens the display sheet (size + view),
// the numbered diamond opens a small "go to a verse" sheet. Everything else
// stays off the page so the reader opens on the Qur'an.
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ReadView } from "@mindfulverse/core/readingPrefs";
import ReadingControls from "./ReadingControls";
import Sheet from "./Sheet";

type Panel = "display" | "jump" | null;

export default function ReaderTools({
  sizeKey,
  onSize,
  view,
  onView,
  maxVerse,
  onJump,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
  view: ReadView;
  onView: (v: ReadView) => void;
  /** With onJump: shows the "Go to a verse" button. */
  maxVerse?: number;
  onJump?: (n: number) => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  // Closing a sheet steps history back (Sheet.tsx); scroll only once that
  // has landed, so the browser's scroll restoration can't cut the jump short.
  function jumpAfterClose(n: number) {
    setPanel(null);
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      window.removeEventListener("popstate", run);
      onJump?.(n);
    };
    window.addEventListener("popstate", run);
    window.setTimeout(run, 200);
  }

  return (
    <>
      <div className="reader-tools">
        {onJump && (
          <button
            type="button"
            className="reader-tool"
            aria-label="Go to a verse"
            aria-haspopup="dialog"
            title="Go to a verse"
            onClick={() => setPanel("jump")}
          >
            <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
              <path d="M20 2 38 20 20 38 2 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <span className="reader-tool-hash" aria-hidden="true">#</span>
          </button>
        )}
        <button
          type="button"
          className="reader-tool reader-tool-aa"
          aria-label="Reading settings"
          aria-haspopup="dialog"
          title="Reading settings"
          onClick={() => setPanel("display")}
        >
          <span aria-hidden="true">Aa</span>
        </button>
      </div>

      {panel === "display" && (
        <Sheet label="Reading settings" title="Reading settings" onClose={() => setPanel(null)}>
          <ReadingControls sizeKey={sizeKey} onSize={onSize} view={view} onView={onView} />
          <button type="button" className="btn secondary display-done" onClick={() => setPanel(null)}>
            Done
          </button>
        </Sheet>
      )}

      {panel === "jump" && onJump && (
        <Sheet label="Go to a verse" title="Go to a verse" onClose={() => setPanel(null)}>
          <JumpForm max={maxVerse ?? 300} onGo={jumpAfterClose} />
        </Sheet>
      )}
    </>
  );
}

function JumpForm({ max, onGo }: { max: number; onGo: (n: number) => void }) {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // After Sheet has moved focus to its ✕ (and remembered the opener), put the
  // cursor in the number field so you can type straight away.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!value || !Number.isInteger(n) || n < 1 || n > max) {
      setHint(`This surah has verses 1 to ${max}.`);
      return;
    }
    onGo(n);
  }

  return (
    <form className="jump-form" onSubmit={submit}>
      <label className="display-choice-label" htmlFor="jump-n">
        Verse number
      </label>
      <div className="jump-row">
        <input
          ref={inputRef}
          id="jump-n"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setHint("");
          }}
          placeholder={`1–${max}`}
          className="field-input"
          aria-describedby="jump-hint"
        />
        <button type="submit" className="btn">
          Go
        </button>
      </div>
      <p id="jump-hint" className="display-choice-hint" role="status">
        {hint}
      </p>
    </form>
  );
}
