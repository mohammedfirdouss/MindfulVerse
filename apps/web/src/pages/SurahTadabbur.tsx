import { track } from "@mindfulverse/core/analytics";
import {
  loadSurahAyahs,
  loadSurahInfo,
  loadSurahTafsir,
  loadSurahs,
  loadTafsirIndex,
} from "@mindfulverse/core/data";
import { addEntry } from "@mindfulverse/core/journal";
import {
  getSurahTadabbur,
  recordSurahTadabbur,
} from "@mindfulverse/core/progress";
import { formatTadabburBody } from "@mindfulverse/core/tadabburBody";
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

import "./tadabbur.css";

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

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah. */
function coveringFromIndex(indexed: number[], ayah: number): number | null {
  let best: number | null = null;
  for (const n of indexed) {
    if (n <= ayah) {
      best = n;
    } else {
      break;
    }
  }
  return best;
}

// The surah's background text, shown first (per user feedback). Long infos are
// trimmed to the opening paragraphs with a "Read more" expander.

const ABOUT_COLLAPSED_PARAGRAPHS = 5;
const ABOUT_EXCERPT_CHARS = 200;

function InfoText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const isHeading = (p: string) => p.length < 60 && !p.includes(".");
  // Collapsed: the first section only (leading subheadings + one paragraph).
  let first = 0;
  while (first < paragraphs.length && isHeading(paragraphs[first])) {
    first += 1;
  }
  const excerpt = Math.min(paragraphs.length, first + 1);
  const shown = expanded
    ? paragraphs
    : paragraphs.slice(0, Math.min(excerpt, ABOUT_COLLAPSED_PARAGRAPHS));
  const more =
    paragraphs.length > excerpt ||
    (paragraphs[excerpt - 1]?.length ?? 0) > ABOUT_EXCERPT_CHARS;

  return (
    <div className="stack">
      <div className={`tafsir${expanded ? "" : " tad-about-clamp"}`}>
        {shown.map((p, i) =>
          isHeading(p) ? <h3 key={i}>{p}</h3> : <p key={i}>{p}</p>
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
  const paragraphs = (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

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
              ? `Ibn Kathir · ${ayah.verseKey}`
              : `Ibn Kathir · with verse ${covering}`}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The reflection area — the physical tadabbur journal's three questions,
// asked one at a time like a conversation.

export interface Draft {
  lessons: string;
  stirs: string;
  action: string;
}

const EMPTY_DRAFT: Draft = { action: "", lessons: "", stirs: "" };

const QUESTIONS: readonly { key: keyof Draft; label: string }[] = [
  { key: "lessons", label: "What does it teach?" },
  { key: "stirs", label: "What stays with you?" },
  { key: "action", label: "What will you do?" },
];

export function hasText(d: Draft | undefined): boolean {
  return (
    !!d &&
    (d.lessons.trim().length > 0 ||
      d.stirs.trim().length > 0 ||
      d.action.trim().length > 0)
  );
}

// Drafts persist per surah on every change, so nothing typed is ever lost
// (reload, closing the tab, leaving the page). Same key as mobile. Stored as
// { [verseKey]: Draft }, empty drafts dropped.

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
): Record<string, Draft> {
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
  const out: Record<string, Draft> = {};
  for (const [verseKey, v] of Object.entries(data as Record<string, unknown>)) {
    if (!v || typeof v !== "object") {
      continue;
    }
    const o = v as Record<string, unknown>;
    const d: Draft = {
      action: typeof o.action === "string" ? o.action : "",
      lessons: typeof o.lessons === "string" ? o.lessons : "",
      stirs: typeof o.stirs === "string" ? o.stirs : "",
    };
    if (hasText(d)) {
      out[verseKey] = d;
    }
  }
  return out;
}

/** Every kept draft for a surah. Never throws. */
export function loadTadabburDrafts(
  surah: number,
  store: DraftStore | null = defaultStore()
): Record<string, Draft> {
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
  draft: Draft,
  store: DraftStore | null = defaultStore()
): void {
  if (!store) {
    return;
  }
  try {
    const all = loadTadabburDrafts(surah, store);
    if (hasText(draft)) {
      all[verseKey] = { ...draft };
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

function ReflectionArea({
  ayah,
  name,
  draft,
  onDraft,
}: {
  ayah: Ayah;
  name: string;
  draft: Draft;
  onDraft: (d: Draft) => void;
}) {
  const [kept, setKept] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const moved = useRef(false);

  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  const answered = draft[q.key].trim().length > 0;
  const canKeep = hasText(draft);

  // After moving between questions, carry focus to the new prompt's input.
  useEffect(() => {
    if (!moved.current) {
      return;
    }
    moved.current = false;
    inputRef.current?.focus();
  }, [step]);

  function go(to: number) {
    moved.current = true;
    setStep(to);
  }

  function keep() {
    if (!canKeep) {
      return;
    }
    addEntry({
      body: formatTadabburBody({
        action: draft.action,
        lessons: draft.lessons,
        reflection: draft.stirs,
      }),
      context: { kind: "tadabbur", ref: ayah.verseKey },
      prompt: `Tadabbur on ${ayah.verseKey}`,
    });
    track({ context: "tadabbur", type: "journal_save" });
    onDraft(EMPTY_DRAFT);
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
        Sit with {name} {ayah.verseKey}. Write as little or as much as you like.
      </p>
      <div className="tad-question">
        <div
          className="tad-steps"
          role="img"
          aria-label={`Question ${step + 1} of ${QUESTIONS.length}`}
        >
          {QUESTIONS.map((x, i) => (
            <span
              key={x.key}
              className={`tad-step${i === step ? " is-current" : ""}`}
            />
          ))}
        </div>
        <label htmlFor={inputId} className="tad-prompt">
          {q.label}
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={3}
          value={draft[q.key]}
          onChange={(e) => {
            onDraft({ ...draft, [q.key]: e.target.value });
            setKept(false);
          }}
          className="tad-input"
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
  const [started, setStarted] = useState(false);
  // Restored from storage; every change is written back (saveTadabburDraft),
  // so leaving never loses words and needs no warning.
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
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
      ? `${name} · Tadabbur | MindfulVerse`
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
          <p className="muted">
            Surahs run from 1 to 114. We couldn’t find the one this link points
            to.
          </p>
          <div>
            <Link to="/sessions" className="btn secondary">
              Back to tadabbur
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
          <p className="muted">
            Something interrupted the connection. Check your network and try
            again in a moment.
          </p>
          <div>
            <Link to="/sessions" className="btn secondary">
              Back to tadabbur
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
    return (
      <div className="stack">
        <Link to="/sessions" className="muted back-link">
          All tadabbur
        </Link>
        <FadeRise show={mounted} reduce={reduce}>
          <div className="stack">
            <TitlePlate surah={surahNumber} name={name} />
            <p
              className="muted"
              style={{ margin: "10px 0 0", textAlign: "center" }}
            >
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
      </div>
    );
  }

  // Completion screen.
  if (phase >= count) {
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
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {surahNumber < 114 && (
              <Link to={`/tadabbur/${surahNumber + 1}`} className="btn">
                Next surah
              </Link>
            )}
            <Link to="/sessions" className="btn secondary">
              Back to tadabbur
            </Link>
          </div>
        </FadeRise>
      </div>
    );
  }

  // One verse per step.
  const a = ayahs[phase];
  const covering = coveringFromIndex(indexed, a.ayah);

  return (
    <div className="stack">
      <Link to="/sessions" className="muted back-link">
        All tadabbur
      </Link>

      <p className="eyebrow" aria-live="polite">
        Verse {phase + 1} of {count}
      </p>

      <FadeRise key={phase} show={mounted} reduce={reduce}>
        <div className="stack">
          <div className="verse" style={{ paddingTop: 0 }}>
            <div className="verse-head">
              <Diamond n={a.ayah} />
              <span className="eyebrow">
                {name} · {a.verseKey}
              </span>
              <span className="rule" />
            </div>
            <p className="arabic" lang="ar" style={{ margin: 0 }}>
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
            draft={drafts[a.verseKey] ?? EMPTY_DRAFT}
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
