import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  loadSessions,
  loadAyahsByKeys,
  loadSurahs,
  loadSurahTafsir,
  parseVerseKey,
} from "../lib/data";
import { addEntry } from "../lib/journal";
import { track } from "../lib/analytics";
import {
  getSessionProgress,
  recordSessionComplete,
  recordSessionStep,
} from "../lib/progress";
import type { Ayah, SessionStep, TadabburSession } from "../lib/types";

// ---------------------------------------------------------------------------
// Motion helpers — transform + opacity only, all under 400ms. No index.css edits.
// ---------------------------------------------------------------------------

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fades + rises its children in when `show` becomes true. Re-triggering is the
 * caller's job: give the wrapper a `key` and flip `show` on mount so each step
 * plays the entrance fresh. When reduced motion is requested, no transform is
 * applied — content simply appears.
 */
function FadeRise({
  show,
  delay = 0,
  reduce,
  children,
  style,
}: {
  show: boolean;
  delay?: number;
  reduce: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const hidden = !show && !reduce;
  const motion: CSSProperties = reduce
    ? {}
    : {
        opacity: show ? 1 : 0,
        transform: hidden ? "translateY(8px)" : "translateY(0)",
        transition: `opacity .34s var(--ease-out) ${delay}ms, transform .34s var(--ease-out) ${delay}ms`,
      };
  return <div style={{ ...motion, ...style }}>{children}</div>;
}

/** Fires once after mount so a CSS transition has a start and end frame. */
function useMounted(resetKey: unknown): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [resetKey]);
  return mounted;
}

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
        setStatus(session ? { kind: "ready", session } : { kind: "notfound" });
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
        <p className="muted">Opening this session…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>We couldn’t open this session</h2>
          <p className="muted">
            Something interrupted the connection. Check your network and try
            again in a moment.
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
          <h2>This session isn’t here</h2>
          <p className="muted">
            We couldn’t find the session you were looking for — it may have been
            moved or renamed.
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
  const reduce = useMemo(prefersReducedMotion, []);

  // Saved progress, read once when the session opens.
  const saved = useMemo(() => getSessionProgress(session.id), [session.id]);
  const wasCompleted = saved?.completedAt != null;
  const stepCount = session.steps.length;
  const resumeStep =
    !wasCompleted && saved != null && saved.step >= 0
      ? Math.min(saved.step, stepCount - 1)
      : undefined;

  const onFinal = phase >= stepCount;
  const mounted = useMounted(phase);

  // Remember the furthest step reached (recordSessionStep never regresses).
  useEffect(() => {
    if (phase >= 0 && phase < stepCount) {
      recordSessionStep(session.id, phase);
    }
  }, [phase, stepCount, session.id]);

  function beginSteps(at: number = 0) {
    if (!started) {
      track({ type: "session_start", sessionId: session.id });
      setStarted(true);
    }
    setPhase(at);
  }

  // Intro screen
  if (phase < 0) {
    return (
      <div className="container stack">
        <Link to="/sessions" className="muted">
          All sessions
        </Link>
        <FadeRise show={mounted} reduce={reduce}>
          <div className="stack">
            <p className="label">{session.theme}</p>
            <h1 style={{ margin: 0 }}>{session.title}</h1>
            <p className="soft">{session.intro}</p>
            <p className="muted" style={{ margin: 0 }}>
              {stepCount} {stepCount === 1 ? "step" : "steps"}, at your own pace.
            </p>
            {wasCompleted && (
              <p className="muted" style={{ margin: 0 }}>
                <span aria-hidden="true" style={{ color: "var(--indigo)" }}>
                  ✦
                </span>{" "}
                You’ve sat with this one before.
              </p>
            )}
            {resumeStep != null ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => beginSteps(resumeStep)}>
                  Continue from step {resumeStep + 1}
                </button>
                <button className="btn secondary" onClick={() => beginSteps()}>
                  Start from the beginning
                </button>
              </div>
            ) : (
              <div>
                <button className="btn" onClick={() => beginSteps()}>
                  Begin
                </button>
              </div>
            )}
          </div>
        </FadeRise>
      </div>
    );
  }

  // Final journal screen
  if (onFinal) {
    return <FinalScreen session={session} reduce={reduce} />;
  }

  // A single step
  const step = session.steps[phase];
  return (
    <div className="container stack">
      <Link to="/sessions" className="muted">
        All sessions
      </Link>

      <p className="label" aria-live="polite">
        Step {phase + 1} of {stepCount}
      </p>

      {/* Keyed by phase + mounted flag so the entrance re-triggers each step. */}
      <FadeRise key={phase} show={mounted} reduce={reduce}>
        <StepView step={step} reduce={reduce} />
      </FadeRise>

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

/** Surah number -> transliterated name, for verse attributions. */
function useSurahNames(): Map<number, string> {
  const [names, setNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => {
        if (alive) setNames(new Map(list.map((s) => [s.number, s.name])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return names;
}

function StepView({ step, reduce }: { step: SessionStep; reduce: boolean }) {
  const [status, setStatus] = useState<VerseStatus>({ kind: "loading" });
  const surahNames = useSurahNames();

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

  // Re-trigger the per-verse stagger whenever the loaded set changes.
  const verseKey =
    status.kind === "ready"
      ? status.ayahs.map((a) => a.verseKey).join(",")
      : status.kind;
  const versesMounted = useMounted(verseKey);

  return (
    <div className="stack">
      {status.kind === "loading" && (
        <p className="muted">Bringing the verses in…</p>
      )}
      {status.kind === "error" && (
        <div className="card">
          <p className="muted">
            We couldn’t load the verses for this step. Try stepping back and
            forward again.
          </p>
        </div>
      )}
      {status.kind === "ready" &&
        status.ayahs.map((a, i) => {
          const { ayah } = parseVerseKey(a.verseKey);
          return (
            <FadeRise
              key={a.verseKey}
              show={versesMounted}
              reduce={reduce}
              delay={i * 50}
            >
              <div className="verse" style={{ paddingTop: i === 0 ? 0 : undefined }}>
                <div className="verse-head">
                  <span className="roundel">{ayah}</span>
                  <span className="rule" />
                </div>
                <p className="arabic" style={{ margin: 0 }}>
                  {a.arabic}
                </p>
                <p className="translation" style={{ margin: "12px 0 0" }}>
                  {a.translation}
                </p>
              </div>
            </FadeRise>
          );
        })}

      {step.reflection && (
        <div
          className="card stack"
          style={{ background: "var(--surface-2)", borderColor: "var(--line-strong)" }}
        >
          <p className="label" style={{ margin: 0 }}>
            Sit with this
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
      <button className="commentary-open" onClick={toggle} aria-expanded={open}>
        {open ? "Hide the commentary" : "Read the commentary"}
      </button>
      {open && (
        <div className="card tafsir stack">
          {status.kind === "loading" && (
            <p className="muted">Fetching the commentary…</p>
          )}
          {status.kind === "error" && (
            <p className="muted">The commentary isn’t available right now.</p>
          )}
          {status.kind === "ready" && status.entries.length === 0 && (
            <p className="muted">
              There’s no commentary for these verses yet.
            </p>
          )}
          {status.kind === "ready" &&
            status.entries.map((e) => {
              const { ayah } = parseVerseKey(e.verseKey);
              return (
                <div key={e.verseKey} className="stack">
                  <div className="verse-head" style={{ marginBottom: 4 }}>
                    <span className="roundel">{ayah}</span>
                    <span className="rule" />
                  </div>
                  <p style={{ margin: 0 }}>{e.text}</p>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final screen: journal entry + willingness-to-pay intent probe
// ---------------------------------------------------------------------------

function FinalScreen({
  session,
  reduce,
}: {
  session: TadabburSession;
  reduce: boolean;
}) {
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(false);
  const [payTapped, setPayTapped] = useState(false);
  const mounted = useMounted("final");

  // Fire session_complete exactly once when the final screen mounts, and
  // remember the completion locally so the session can be resumed as "done".
  useEffect(() => {
    track({ type: "session_complete", sessionId: session.id });
    recordSessionComplete(session.id);
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
      <FadeRise show={mounted} reduce={reduce}>
        <div className="stack">
          <p className="label">{session.title}</p>
          <h1 style={{ margin: 0 }}>A moment to reflect</h1>
        </div>
      </FadeRise>

      <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
        <div className="card stack">
          <p className="soft" style={{ margin: 0 }}>
            {session.journalPrompt}
          </p>
          {saved ? (
            <div className="stack">
              <p className="soft" style={{ margin: 0 }}>
                Kept in your journal — return to it whenever you like.
              </p>
              <div>
                <Link to="/journal" className="btn secondary">
                  Go to journal
                </Link>
              </div>
            </div>
          ) : (
            <div className="stack">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write what stayed with you…"
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
              <div>
                <button className="btn" onClick={save} disabled={!canSave}>
                  Save reflection
                </button>
              </div>
            </div>
          )}
        </div>
      </FadeRise>

      {/* A quiet, one-time willingness-to-pay probe — an invitation, not a nag. */}
      <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 120}>
        <div
          className="card stack"
          style={{ background: "var(--surface-2)", borderColor: "var(--line-strong)" }}
        >
          {payTapped ? (
            <p className="soft" style={{ margin: 0 }}>
              Thanks, noted. Your reflections stay here for you, free, either
              way.
            </p>
          ) : (
            <div className="stack">
              <p className="label" style={{ margin: 0 }}>
                A small question
              </p>
              <p className="soft" style={{ margin: 0 }}>
                There are more guided sessions we’d love to open up. If they
                cost around $3 a month, would that be worth it to you?
              </p>
              <div>
                <button className="btn secondary" onClick={tapPay}>
                  Yes, I’d pay for that
                </button>
              </div>
            </div>
          )}
        </div>
      </FadeRise>

      <Link to="/sessions" className="muted">
        Back to all sessions
      </Link>
    </div>
  );
}
