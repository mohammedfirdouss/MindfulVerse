import { track } from "@mindfulverse/core/analytics";
import { commentaryParagraphs } from "@mindfulverse/core/commentaryText";
import {
  loadSurahAyahs,
  loadSurahInfo,
  loadSurahTafsir,
  loadSurahs,
  loadTafsirIndex,
} from "@mindfulverse/core/data";
import { addEntry, getEntries } from "@mindfulverse/core/journal";
import {
  getSurahTadabbur,
  recordSurahTadabbur,
} from "@mindfulverse/core/progress";
import {
  EMPTY_REFLECTION,
  FEELINGS,
  hasReflection,
  MAX_FEELINGS,
  migrateDraft,
  PROMPT_INTRO,
  PROMPTS,
  reflectionBody,
} from "@mindfulverse/core/reflectionPrompts";
import type { ReflectionDraft } from "@mindfulverse/core/reflectionPrompts";
import { INTRO_CREDIT, introBlocks } from "@mindfulverse/core/surahIntro";
import { surahJournal } from "@mindfulverse/core/surahJournal";
import { TAFSIR_CREDIT } from "@mindfulverse/core/tafsirCredit";
import type {
  Ayah,
  SurahInfo,
  SurahMeta,
  SurahTafsir,
} from "@mindfulverse/core/types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { Diamond, DyeRule, TitlePlate } from "../components/Adire";
import BackLink from "../components/BackLink";
import IntentionField from "../components/IntentionField";
import { coveringAyah } from "../lib/tafsirCovering";

import "./checkin.css";
import "./tadabbur.css";
import "./surah-journal.css";

// Motion helpers — transform + opacity only, under 400ms (same approach as
// SessionPlayer). Reduced motion: content simply appears.

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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

// Shared bits

// The surah's background text (Maududi's introduction), shown first, with why
// it was revealed leading when the text has a background section. Long infos
// are trimmed to the opening section with a "Read more" expander.

const ABOUT_COLLAPSED_PARAGRAPHS = 5;
const ABOUT_EXCERPT_CHARS = 200;

function InfoText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => introBlocks(text), [text]);
  // Collapsed: the first section only (leading headings + one paragraph).
  let first = 0;
  while (first < blocks.length && blocks[first].kind === "heading") {
    first += 1;
  }
  const excerpt = Math.min(blocks.length, first + 1);
  const shown = expanded
    ? blocks
    : blocks.slice(0, Math.min(excerpt, ABOUT_COLLAPSED_PARAGRAPHS));
  const more =
    blocks.length > excerpt ||
    (blocks[excerpt - 1]?.text.length ?? 0) > ABOUT_EXCERPT_CHARS;

  return (
    <div className="stack">
      <div className={`tafsir${expanded ? "" : " tad-about-clamp"}`}>
        {shown.map((b, i) =>
          b.kind === "heading" ? (
            <h3 key={i}>{b.text}</h3>
          ) : (
            <p key={i}>{b.text}</p>
          )
        )}
      </div>
      {more && (
        <div>
          <button
            type="button"
            className="commentary-open"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        </div>
      )}
      <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
        {INTRO_CREDIT}
      </p>
    </div>
  );
}

// Collapsible commentary for one verse (lazy tafsir fetch, covering-entry).

function VerseCommentary({
  ayah,
  covering,
  ensureTafsir,
  tafsir,
  indexUnavailable,
}: {
  ayah: Ayah;
  covering: number | null;
  ensureTafsir: () => void;
  tafsir: SurahTafsir | null;
  indexUnavailable: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (indexUnavailable) {
    return (
      <p className="muted" style={{ fontSize: ".9rem", margin: 0 }}>
        The commentary isn’t available right now.
      </p>
    );
  }

  if (covering === null) {
    return (
      <p className="muted" style={{ fontSize: ".9rem", margin: 0 }}>
        No commentary for this verse.
      </p>
    );
  }

  const direct = covering === ayah.ayah;
  const text = tafsir ? (tafsir[String(covering)] ?? "") : null;
  const paragraphs = commentaryParagraphs(text);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      ensureTafsir();
    }
  }

  return (
    <div className="stack">
      <button
        type="button"
        className="commentary-open"
        onClick={toggle}
        aria-expanded={open}
      >
        {open
          ? "Hide the commentary"
          : direct
            ? "Read the commentary"
            : `Read the commentary (with verse ${covering})`}
      </button>
      {open && (
        <div className="card tafsir stack">
          <p className="eyebrow" style={{ margin: 0 }}>
            {direct
              ? `Ibn Kathir on ${ayah.verseKey}`
              : `Ibn Kathir on the passage from verse ${covering}`}
          </p>
          {text === null ? (
            <p className="muted" style={{ margin: 0 }}>
              Opening the commentary…
            </p>
          ) : paragraphs.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              The commentary isn’t available right now.
            </p>
          ) : (
            <div>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : "0.8em 0 0" }}>
                  {p}
                </p>
              ))}
              <p
                className="muted"
                style={{ fontSize: "0.8rem", margin: "1em 0 0" }}
              >
                {TAFSIR_CREDIT}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The reflection area: four questions, asked one at a time like a
// conversation. Copy and the feelings list live in core so Android matches.

const STEP_COUNT = 4;

/** Whether the question at `step` has anything in it yet (Next vs Skip). */
function stepAnswered(d: ReflectionDraft, step: number): boolean {
  switch (step) {
    case 0: {
      return d.feelings.length > 0 || d.feelingNote.trim() !== "";
    }
    case 1: {
      return d.reminder.trim() !== "";
    }
    case 2: {
      return d.takeaway.trim() !== "" || d.action.trim() !== "";
    }
    default: {
      return d.research.trim() !== "";
    }
  }
}

/** Toggle one feeling, never past MAX_FEELINGS, kept in display order. */
export function toggleFeeling(feelings: string[], word: string): string[] {
  if (feelings.includes(word)) {
    return feelings.filter((f) => f !== word);
  }
  if (feelings.length >= MAX_FEELINGS) {
    return feelings;
  }
  const next = new Set([...feelings, word]);
  return FEELINGS.filter((f) => next.has(f));
}

// Drafts persist per surah on every change, so nothing typed is ever lost
// (reload, closing the tab, leaving the page). Same key as mobile. Stored as
// { [verseKey]: ReflectionDraft }, empty drafts dropped. Old drafts
// ({ lessons, stirs, action }) are read through migrateDraft.

const DRAFTS_PREFIX = "mindfulverse.tadabburDrafts.v1:";

export function tadabburDraftKey(surah: number): string {
  return `${DRAFTS_PREFIX}${surah}`;
}

type DraftStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStore(): DraftStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseTadabburDrafts(
  raw: string | null | undefined
): Record<string, ReflectionDraft> {
  if (!raw) {
    return {};
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  const out: Record<string, ReflectionDraft> = {};
  for (const [verseKey, v] of Object.entries(data as Record<string, unknown>)) {
    const d = migrateDraft(v);
    if (hasReflection(d)) {
      out[verseKey] = d;
    }
  }
  return out;
}

/** Every kept draft for a surah. Never throws. */
export function loadTadabburDrafts(
  surah: number,
  store: DraftStore | null = defaultStore()
): Record<string, ReflectionDraft> {
  if (!store) {
    return {};
  }
  try {
    return parseTadabburDrafts(store.getItem(tadabburDraftKey(surah)));
  } catch {
    return {};
  }
}

/** Set (or, when empty, clear) one verse's draft. Never throws. */
export function saveTadabburDraft(
  surah: number,
  verseKey: string,
  draft: ReflectionDraft,
  store: DraftStore | null = defaultStore()
): void {
  if (!store) {
    return;
  }
  try {
    const all = loadTadabburDrafts(surah, store);
    if (hasReflection(draft)) {
      all[verseKey] = { ...draft, feelings: [...draft.feelings] };
    } else {
      // oxlint-disable-next-line typescript/no-dynamic-delete -- removing one verse draft by key
      delete all[verseKey];
    }
    const key = tadabburDraftKey(surah);
    if (Object.keys(all).length === 0) {
      store.removeItem(key);
    } else {
      store.setItem(key, JSON.stringify(all));
    }
  } catch {
    /* storage full or blocked — the draft stays in memory */
  }
}

function QuestionFields({
  step,
  inputId,
  draft,
  edit,
}: {
  step: number;
  inputId: string;
  draft: ReflectionDraft;
  edit: (patch: Partial<ReflectionDraft>) => void;
}) {
  if (step === 0) {
    const promptId = `${inputId}-prompt`;
    const hintId = `${inputId}-hint`;
    const full = draft.feelings.length >= MAX_FEELINGS;
    return (
      <>
        <p id={promptId} className="tad-prompt" style={{ margin: 0 }}>
          {PROMPTS.feeling}
        </p>
        <p id={hintId} className="muted tad-hint">
          Pick up to three.
        </p>
        <div
          className="ci-chips tad-feelings"
          role="group"
          aria-labelledby={promptId}
          aria-describedby={hintId}
        >
          {FEELINGS.map((word) => {
            const on = draft.feelings.includes(word);
            return (
              <button
                key={word}
                type="button"
                className="ci-chip"
                aria-pressed={on}
                disabled={full && !on}
                onClick={() =>
                  edit({ feelings: toggleFeeling(draft.feelings, word) })
                }
              >
                {word}
              </button>
            );
          })}
        </div>
        <textarea
          id={inputId}
          rows={2}
          value={draft.feelingNote}
          placeholder={PROMPTS.feelingPlaceholder}
          aria-label="Say more about how it made you feel"
          onChange={(e) => edit({ feelingNote: e.target.value })}
          className="tad-input tad-input-short"
        />
      </>
    );
  }
  if (step === 1) {
    return (
      <>
        <label htmlFor={inputId} className="tad-prompt">
          {PROMPTS.reminder}
        </label>
        <textarea
          id={inputId}
          rows={3}
          value={draft.reminder}
          onChange={(e) => edit({ reminder: e.target.value })}
          className="tad-input"
        />
      </>
    );
  }
  if (step === 2) {
    return (
      <>
        <label htmlFor={inputId} className="tad-prompt">
          {PROMPTS.takeaway}
        </label>
        <textarea
          id={inputId}
          rows={3}
          value={draft.takeaway}
          onChange={(e) => edit({ takeaway: e.target.value })}
          className="tad-input"
        />
        <input
          type="text"
          value={draft.action}
          placeholder={PROMPTS.actionPlaceholder}
          aria-label={PROMPTS.actionPlaceholder}
          onChange={(e) => edit({ action: e.target.value })}
          className="tad-input tad-input-line"
        />
      </>
    );
  }
  return (
    <>
      <label htmlFor={inputId} className="tad-prompt">
        {PROMPTS.research}
      </label>
      <textarea
        id={inputId}
        rows={2}
        value={draft.research}
        onChange={(e) => edit({ research: e.target.value })}
        className="tad-input tad-input-short"
      />
    </>
  );
}

function ReflectionArea({
  ayah,
  name,
  draft,
  onDraft,
}: {
  ayah: Ayah;
  name: string;
  draft: ReflectionDraft;
  onDraft: (d: ReflectionDraft) => void;
}) {
  const [kept, setKept] = useState(false);
  const [step, setStep] = useState(0);
  const questionRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  const last = step === STEP_COUNT - 1;
  const answered = stepAnswered(draft, step);
  const canKeep = hasReflection(draft);

  // After moving between questions, carry focus to the new question's first
  // control (a feeling chip on the first, the text box on the rest).
  useEffect(() => {
    if (!moved.current) {
      return;
    }
    moved.current = false;
    questionRef.current
      ?.querySelector<HTMLElement>("button.ci-chip:not(:disabled), textarea")
      ?.focus();
  }, [step]);

  function go(to: number) {
    moved.current = true;
    setStep(to);
  }

  function edit(patch: Partial<ReflectionDraft>) {
    onDraft({ ...draft, ...patch });
    setKept(false);
  }

  function keep() {
    if (!canKeep) {
      return;
    }
    addEntry({
      body: reflectionBody(draft),
      context: { kind: "tadabbur", ref: ayah.verseKey },
      prompt: `Tadabbur on ${ayah.verseKey}`,
    });
    track({ context: "tadabbur", type: "journal_save" });
    onDraft(EMPTY_REFLECTION);
    setStep(0);
    setKept(true);
  }

  const inputId = `tad-q-${ayah.verseKey}`;

  return (
    <div className="stack tad-reflect">
      <DyeRule />
      <p className="eyebrow" style={{ margin: 0 }}>
        Your tadabbur
      </p>
      <p className="muted" style={{ fontSize: ".9rem", margin: 0 }}>
        Sit with {name} {ayah.verseKey}. {PROMPT_INTRO}
      </p>
      <div className="tad-question" ref={questionRef}>
        <div
          className="tad-steps"
          role="img"
          aria-label={`Question ${step + 1} of ${STEP_COUNT}`}
        >
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={`tad-step${i === step ? " is-current" : ""}`}
            />
          ))}
        </div>
        <QuestionFields
          step={step}
          inputId={inputId}
          draft={draft}
          edit={edit}
        />
        <div className="tad-question-nav">
          {step > 0 && (
            <button
              type="button"
              className="commentary-open"
              aria-label="Back to the previous question"
              onClick={() => go(step - 1)}
            >
              Back
            </button>
          )}
          <span style={{ flex: 1 }} />
          {!last &&
            (answered ? (
              <button
                type="button"
                className="commentary-open"
                onClick={() => go(step + 1)}
              >
                Next question
              </button>
            ) : (
              <button
                type="button"
                className="commentary-open tad-skip"
                aria-label="Skip this question"
                onClick={() => go(step + 1)}
              >
                Skip
              </button>
            ))}
        </div>
      </div>
      <div className="tad-keep">
        <button
          type="button"
          className="btn secondary"
          onClick={keep}
          disabled={!canKeep}
        >
          Keep in journal
        </button>
        <span className="muted tad-keep-note" role="status">
          {kept ? "Kept in your journal ✓" : canKeep ? "Draft kept" : ""}
        </span>
      </div>
    </div>
  );
}

// The page

type LoadStatus = "loading" | "ready" | "error";

// Keyed on the surah so "Next surah" starts from clean state — no stale ayahs,
// in-flight tafsir or drafts carried over from the previous surah.
export default function SurahTadabbur() {
  const { surah } = useParams<{ surah: string }>();
  return <SurahTadabburPage key={surah} />;
}

function SurahTadabburPage() {
  const { surah } = useParams<{ surah: string }>();
  const [params] = useSearchParams();
  const surahNumber = Number(surah);
  const validSurah =
    Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [indexed, setIndexed] = useState<number[]>([]);
  const [indexFailed, setIndexFailed] = useState(false);
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [info, setInfo] = useState<SurahInfo | null>(null);
  const [tafsir, setTafsir] = useState<SurahTafsir | null>(null);
  const tafsirPromise = useRef<Promise<SurahTafsir> | null>(null);

  /** -1 = about screen, 0..count-1 = a verse, count = completion. */
  const [phase, setPhase] = useState(-1);
  const [, setPageTick] = useState(0);
  const [started, setStarted] = useState(false);
  // Restored from storage; every change is written back (saveTadabburDraft),
  // so leaving never loses words and needs no warning.
  const [drafts, setDrafts] = useState<Record<string, ReflectionDraft>>(() =>
    validSurah ? loadTadabburDrafts(surahNumber) : {}
  );
  const reduce = useMemo(prefersReducedMotion, []);
  // Re-read on every phase change so returning to the about screen offers the
  // latest resume point, not the one from when the page opened.
  const saved = useMemo(
    () => (validSurah ? getSurahTadabbur(surahNumber) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validSurah, surahNumber, phase]
  );

  useEffect(() => {
    if (!validSurah) {
      return;
    }
    let active = true;
    setStatus("loading");
    setPhase(-1);
    setStarted(false);
    setTafsir(null);
    tafsirPromise.current = null;
    setInfo(null);

    Promise.all([
      loadSurahAyahs(surahNumber),
      loadTafsirIndex().catch<Record<string, number[]> | null>(() => null),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, indexData, surahList]) => {
        if (!active) {
          return;
        }
        setAyahs(ayahData);
        setIndexed(indexData?.[String(surahNumber)] ?? []);
        setIndexFailed(indexData === null);
        setMeta(surahList.find((s) => s.number === surahNumber));
        setStatus("ready");
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });

    loadSurahInfo(surahNumber)
      .then((d) => {
        if (active && d) {
          setInfo(d);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [validSurah, surahNumber]);

  const name = meta?.name ?? `Surah ${surahNumber}`;

  useEffect(() => {
    document.title = validSurah
      ? `Tadabbur on ${name} | MindfulVerse`
      : "Tadabbur | MindfulVerse";
  }, [validSurah, name]);

  // Deep link (?v=n): start straight at that verse once the surah loads.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (status !== "ready" || deepLinked.current) {
      return;
    }
    deepLinked.current = true;
    const v = Number(params.get("v"));
    if (Number.isInteger(v) && v >= 1 && v <= ayahs.length) {
      begin(v - 1);
    }
    // `begin` is stable enough for this one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, params, ayahs.length]);

  // Remember the furthest verse pondered (recordSurahTadabbur never regresses).
  useEffect(() => {
    if (status !== "ready" || phase < 0 || ayahs.length === 0) {
      return;
    }
    const a = ayahs[Math.min(phase, ayahs.length - 1)];
    if (a.surah !== surahNumber) {
      return;
    }
    recordSurahTadabbur(surahNumber, a.ayah);
  }, [phase, status, ayahs, surahNumber]);

  // Each verse starts at the top — Next sits below the reflection area.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  const mounted = useMounted(phase);

  function begin(at: number) {
    if (!started) {
      track({ sessionId: `surah-${surahNumber}`, type: "session_start" });
      setStarted(true);
    }
    setPhase(at);
  }

  /** Fetch the surah's tafsir once, on first request. */
  function ensureTafsir(): void {
    if (!tafsirPromise.current) {
      tafsirPromise.current = loadSurahTafsir(surahNumber)
        .then((t) => {
          setTafsir(t);
          return t;
        })
        .catch(() => {
          tafsirPromise.current = null;
          const empty: SurahTafsir = {};
          setTafsir(empty);
          return empty;
        });
    }
  }

  if (!validSurah) {
    return (
      <div>
        <div className="card stack">
          <h2>That surah isn’t here</h2>
          <p className="muted">That surah doesn’t exist.</p>
          <div>
            <Link to="/sessions" className="btn secondary">
              Tadabbur
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div>
        <p className="muted">Opening the surah…</p>
      </div>
    );
  }

  if (status === "error" || ayahs.length === 0) {
    return (
      <div>
        <div className="card stack">
          <h2>We couldn’t open this surah</h2>
          <p className="muted">Check your connection and try again.</p>
          <div>
            <Link to="/sessions" className="btn secondary">
              Tadabbur
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const count = ayahs.length;

  // About screen: background first, then the way in.
  if (phase < 0) {
    const resumeAyah =
      saved !== null &&
      saved !== undefined &&
      saved.ayah >= 1 &&
      saved.ayah <= count
        ? saved.ayah
        : null;
    const hasPage = !surahJournal(getEntries(), surahNumber).isEmpty;
    return (
      <div className="stack">
        <BackLink to="/sessions">Tadabbur</BackLink>
        <FadeRise show={mounted} reduce={reduce}>
          <div className="stack">
            <TitlePlate surah={surahNumber} name={name} />
            <p className="muted" style={{ margin: "10px 0 0" }}>
              {count} {count === 1 ? "verse" : "verses"}, one at a time.
            </p>
          </div>
        </FadeRise>
        {info && (
          <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
            <div className="card stack tad-about">
              <p className="eyebrow" style={{ margin: 0 }}>
                About this surah
              </p>
              <InfoText text={info.text} />
            </div>
          </FadeRise>
        )}
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 90}>
          <IntentionField
            surah={surahNumber}
            surahName={name}
            onSaved={() => setPageTick((n) => n + 1)}
          />
        </FadeRise>
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 120}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {resumeAyah === null || resumeAyah === undefined ? (
              <button type="button" className="btn" onClick={() => begin(0)}>
                Begin pondering
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => begin(resumeAyah - 1)}
                >
                  Continue from verse {resumeAyah}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => begin(0)}
                >
                  Start from verse 1
                </button>
              </>
            )}
          </div>
        </FadeRise>
        {hasPage && (
          <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 150}>
            <div>
              <Link to={`/tadabbur/${surahNumber}/journal`} className="sj-link">
                {`Your page on ${name}`}
              </Link>
            </div>
          </FadeRise>
        )}
      </div>
    );
  }

  // Completion screen.
  if (phase >= count) {
    const intention = surahJournal(getEntries(), surahNumber).intention?.body;
    return (
      <div className="stack">
        <FadeRise show={mounted} reduce={reduce}>
          <div className="stack">
            <h1>You’ve sat with all of {name}.</h1>
            <p className="soft">
              {count} {count === 1 ? "verse" : "verses"}, pondered at your own
              pace. May what you wrote stay with you.
            </p>
          </div>
        </FadeRise>
        {intention && (
          <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 30}>
            <div className="intention">
              <p className="eyebrow" style={{ margin: 0 }}>
                You began with:
              </p>
              <blockquote className="intention-quote">{intention}</blockquote>
            </div>
          </FadeRise>
        )}
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {surahNumber < 114 && (
              <Link to={`/tadabbur/${surahNumber + 1}`} className="btn">
                Next surah
              </Link>
            )}
            <Link
              to={`/tadabbur/${surahNumber}/journal`}
              className="btn secondary"
            >
              {`See your page on ${name}`}
            </Link>
            <Link to="/sessions" className="btn secondary">
              Tadabbur
            </Link>
          </div>
        </FadeRise>
      </div>
    );
  }

  // One verse per step.
  const a = ayahs[phase];
  const covering = coveringAyah(indexed, a.ayah);

  return (
    <div className="stack">
      <BackLink to="/sessions">Tadabbur</BackLink>

      <p className="eyebrow" aria-live="polite">
        Verse {phase + 1} of {count}
      </p>

      <FadeRise key={phase} show={mounted} reduce={reduce}>
        <div className="stack">
          <div className="verse" style={{ paddingTop: 0 }}>
            <div className="verse-head">
              <Diamond n={a.ayah} />
              <span className="eyebrow">
                {name}, {a.verseKey}
              </span>
              <span className="rule" />
            </div>
            <p className="arabic" lang="ar" dir="rtl" style={{ margin: 0 }}>
              {a.arabic}
            </p>
            <p className="translation" style={{ margin: "12px 0 0" }}>
              {a.translation}
            </p>
          </div>

          <VerseCommentary
            ayah={a}
            covering={covering}
            ensureTafsir={ensureTafsir}
            tafsir={tafsir}
            indexUnavailable={indexFailed}
          />

          <ReflectionArea
            key={a.verseKey}
            ayah={a}
            name={name}
            draft={drafts[a.verseKey] ?? EMPTY_REFLECTION}
            onDraft={(d) => {
              saveTadabburDraft(surahNumber, a.verseKey, d);
              setDrafts((prev) => ({ ...prev, [a.verseKey]: d }));
            }}
          />
        </div>
      </FadeRise>

      <div className="tad-nav">
        <button
          type="button"
          className="btn secondary"
          onClick={() => setPhase((p) => Math.max(-1, p - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setPhase((p) => p + 1)}
        >
          {phase + 1 === count ? "Finish" : "Next verse"}
        </button>
      </div>
    </div>
  );
}
