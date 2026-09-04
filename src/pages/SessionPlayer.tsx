import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  loadSessions,
  loadAyahsByKeys,
  loadSurahTafsir,
  parseVerseKey,
} from "../lib/data";
import { addEntry } from "../lib/journal";
import { track } from "../lib/analytics";
import type { Ayah, SessionStep, TadabburSession } from "../lib/types";

// ---------------------------------------------------------------------------
// Session loading
// ---------------------------------------------------------------------------

type LoadStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "notfound" }
  | { kind: "ready"; session: TadabburSession };

export default function SessionPlayer() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    loadSessions()
      .then((sessions) => {
        if (!alive) return;
        const session = sessions.find((s) => s.id === id);
        setStatus(
          session ? { kind: "ready", session } : { kind: "notfound" }
        );
      })
      .catch(() => {
        if (alive) setStatus({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status.kind === "loading") {
    return (
      <div className="container">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>Couldn’t load this session</h2>
          <p className="muted">
            Something went wrong. Please check your connection and try again.
          </p>
          <Link to="/sessions" className="btn secondary">
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  if (status.kind === "notfound") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>Session not found</h2>
          <p className="muted">
            We couldn’t find that session. It may have been moved.
          </p>
          <Link to="/sessions" className="btn secondary">
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  return <SessionFlow session={status.session} />;
}

// ---------------------------------------------------------------------------
// The guided flow: intro -> steps (one at a time) -> final journal screen
// ---------------------------------------------------------------------------

// Phase index: -1 = intro, 0..steps.length-1 = a step, steps.length = final.
function SessionFlow({ session }: { session: TadabburSession }) {
  const [phase, setPhase] = useState<number>(-1);
  const [started, setStarted] = useState(false);

  const stepCount = session.steps.length;
  const onFinal = phase >= stepCount;

  function beginSteps() {
    if (!started) {
      track({ type: "session_start", sessionId: session.id });
      setStarted(true);
    }
    setPhase(0);
  }

  // Intro screen
  if (phase < 0) {
    return (
      <div className="container stack">
        <Link to="/sessions" className="muted">
          ← All sessions
        </Link>
        <div className="card stack">
          <p className="eyebrow">{session.theme}</p>
          <h1 style={{ margin: 0 }}>{session.title}</h1>
          <p>{session.intro}</p>
          <p className="muted" style={{ margin: 0 }}>
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </p>
          <button className="btn" onClick={beginSteps}>
            Begin
          </button>
        </div>
      </div>
    );
  }

  // Final journal screen
  if (onFinal) {
    return <FinalScreen session={session} />;
  }

  // A single step
  const step = session.steps[phase];
  return (
    <div className="container stack">
      <Link to="/sessions" className="muted">
        ← All sessions
      </Link>

      <p className="eyebrow">
        Step {phase + 1} of {stepCount}
      </p>

      <StepView key={phase} step={step} />

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn secondary"
          onClick={() => setPhase((p) => Math.max(-1, p - 1))}
        >
          Back
        </button>
        <button className="btn" onClick={() => setPhase((p) => p + 1)}>
          {phase + 1 === stepCount ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One step: verses (arabic + translation), reflection prompt, optional tafsir
// ---------------------------------------------------------------------------

type VerseStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; ayahs: Ayah[] };

function StepView({ step }: { step: SessionStep }) {
  const [status, setStatus] = useState<VerseStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setStatus({ kind: "loading" });
    loadAyahsByKeys(step.verseKeys)
      .then((ayahs) => {
        if (alive) setStatus({ kind: "ready", ayahs });
      })
      .catch(() => {
        if (alive) setStatus({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [step]);

  return (
    <div className="stack">
      {status.kind === "loading" && (
        <p className="muted">Loading verses…</p>
      )}
      {status.kind === "error" && (
        <div className="card">
          <p className="muted">Couldn’t load the verses for this step.</p>
        </div>
      )}
      {status.kind === "ready" &&
        status.ayahs.map((a) => (
          <div key={a.verseKey} className="card stack">
            <p className="arabic" style={{ margin: 0 }}>
              {a.arabic}
            </p>
            <p className="translation" style={{ margin: 0 }}>
              {a.translation}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: ".8rem" }}>
              {a.verseKey}
            </p>
          </div>
        ))}

      {step.reflection && (
        <div
          className="card stack"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--accent-soft)",
          }}
        >
          <p className="eyebrow" style={{ margin: 0 }}>
            Reflect
          </p>
          <p style={{ margin: 0 }}>{step.reflection}</p>
        </div>
      )}

      <TafsirDisclosure verseKeys={step.verseKeys} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible tafsir for the step's verses
// ---------------------------------------------------------------------------

type TafsirEntry = { verseKey: string; text: string };
type TafsirStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; entries: TafsirEntry[] };

function TafsirDisclosure({ verseKeys }: { verseKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TafsirStatus>({ kind: "idle" });

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || status.kind !== "idle") return;

    setStatus({ kind: "loading" });
    try {
      const surahs = Array.from(
        new Set(verseKeys.map((vk) => parseVerseKey(vk).surah))
      );
      const maps = await Promise.all(surahs.map((s) => loadSurahTafsir(s)));
      const bySurah = new Map(surahs.map((s, i) => [s, maps[i]]));
      const entries: TafsirEntry[] = [];
      for (const vk of verseKeys) {
        const { surah, ayah } = parseVerseKey(vk);
        const text = bySurah.get(surah)?.[String(ayah)];
        if (text) entries.push({ verseKey: vk, text });
      }
      setStatus({ kind: "ready", entries });
    } catch {
      setStatus({ kind: "error" });
    }
  }

  return (
    <div className="stack">
      <button className="btn ghost" onClick={toggle} aria-expanded={open}>
        {open ? "Hide tafsir" : "Show tafsir"}
      </button>
      {open && (
        <div className="card tafsir stack">
          {status.kind === "loading" && (
            <p className="muted">Loading tafsir…</p>
          )}
          {status.kind === "error" && (
            <p className="muted">Couldn’t load tafsir right now.</p>
          )}
          {status.kind === "ready" && status.entries.length === 0 && (
            <p className="muted">No tafsir available for these verses.</p>
          )}
          {status.kind === "ready" &&
            status.entries.map((e) => (
              <div key={e.verseKey} className="stack">
                <p className="muted" style={{ margin: 0, fontSize: ".8rem" }}>
                  {e.verseKey}
                </p>
                <p style={{ margin: 0 }}>{e.text}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final screen: journal entry + willingness-to-pay intent probe
// ---------------------------------------------------------------------------

function FinalScreen({ session }: { session: TadabburSession }) {
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);
  const [payTapped, setPayTapped] = useState(false);

  // Fire session_complete exactly once when the final screen mounts.
  useEffect(() => {
    track({ type: "session_complete", sessionId: session.id });
  }, [session.id]);

  const canSave = useMemo(() => body.trim().length > 0 && !saved, [body, saved]);

  function save() {
    if (!canSave) return;
    addEntry({
      prompt: session.journalPrompt,
      body: body.trim(),
      context: { kind: "session", ref: session.id },
    });
    track({ type: "journal_save", context: "session" });
    setSaved(true);
  }

  function tapPay() {
    if (payTapped) return;
    track({ type: "intent_pay_tap", where: "session_end" });
    setPayTapped(true);
  }

  return (
    <div className="container stack">
      <p className="eyebrow">{session.title}</p>
      <h1 style={{ margin: 0 }}>A moment to reflect</h1>

      <div className="card stack">
        <p style={{ margin: 0 }}>{session.journalPrompt}</p>
        {saved ? (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Saved to your journal. ✓
            </p>
            <Link to="/journal" className="btn secondary">
              Go to journal
            </Link>
          </div>
        ) : (
          <div className="stack">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your reflection…"
              rows={6}
              style={{
                width: "100%",
                font: "inherit",
                padding: 12,
                borderRadius: "var(--radius)",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
            <button className="btn" onClick={save} disabled={!canSave}>
              Save reflection
            </button>
          </div>
        )}
      </div>

      <div className="card stack" style={{ background: "var(--surface-2)" }}>
        {payTapped ? (
          <p className="muted" style={{ margin: 0 }}>
            Thanks, noted. 🌱
          </p>
        ) : (
          <button
            className="btn ghost"
            onClick={tapPay}
            style={{ padding: 0, justifyContent: "flex-start" }}
          >
            Unlock more sessions — would you pay $3/mo?
          </button>
        )}
      </div>

      <Link to="/sessions" className="muted">
        ← Back to all sessions
      </Link>
    </div>
  );
}
