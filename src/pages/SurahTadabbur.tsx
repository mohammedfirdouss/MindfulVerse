import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  loadSurahAyahs,
  loadSurahTafsir,
  loadSurahs,
  loadTafsirIndex,
} from "../lib/data";
import { addEntry } from "../lib/journal";
import { track } from "../lib/analytics";
import { getSurahTadabbur, recordSurahTadabbur } from "../lib/progress";
import type { Ayah, SurahMeta, SurahTafsir } from "../lib/types";

// ---------------------------------------------------------------------------
// Motion helpers — transform + opacity only, under 400ms (same approach as
// SessionPlayer). Reduced motion: content simply appears.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

interface SurahInfo {
  surah: number;
  name: string;
  text: string;
}

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah. */
function coveringFromIndex(indexed: number[], ayah: number): number | null {
  let best: number | null = null;
  for (const n of indexed) {
    if (n <= ayah) best = n;
    else break;
  }
  return best;
}

const textareaStyle: CSSProperties = {
  width: "100%",
  font: "inherit",
  fontSize: ".95rem",
  padding: 10,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  resize: "vertical",
};

// ---------------------------------------------------------------------------
// The surah's background text, shown first (per user feedback). Long infos are
// trimmed to the opening paragraphs with a "Read more" expander.
// ---------------------------------------------------------------------------

const ABOUT_COLLAPSED_PARAGRAPHS = 5;

function InfoText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const shown = expanded
    ? paragraphs
    : paragraphs.slice(0, ABOUT_COLLAPSED_PARAGRAPHS);
  const truncated = paragraphs.length > shown.length;

  return (
    <div className="stack">
      <div className="tafsir">
        {shown.map((p, i) =>
          p.length < 60 && !p.includes(".") ? (
            <h3 key={i}>{p}</h3>
          ) : (
            <p key={i}>{p}</p>
          )
        )}
      </div>
      {truncated && (
        <div>
          <button className="commentary-open" onClick={() => setExpanded(true)}>
            Read more
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible commentary for one verse (lazy tafsir fetch, covering-entry).
// ---------------------------------------------------------------------------

function VerseCommentary({
  ayah,
  covering,
  ensureTafsir,
  tafsir,
}: {
  ayah: Ayah;
  covering: number | null;
  ensureTafsir: () => void;
  tafsir: SurahTafsir | null;
}) {
  const [open, setOpen] = useState(false);

  if (covering === null) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: ".9rem" }}>
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
    if (next) ensureTafsir();
  }

  return (
    <div className="stack">
      <button className="commentary-open" onClick={toggle} aria-expanded={open}>
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

// ---------------------------------------------------------------------------
// The reflection area — the physical tadabbur journal's three questions.
// ---------------------------------------------------------------------------

function ReflectionArea({ ayah, name }: { ayah: Ayah; name: string }) {
  const [lessons, setLessons] = useState("");
  const [stirs, setStirs] = useState("");
  const [action, setAction] = useState("");
  const [saved, setSaved] = useState(false);

  const canSave =
    !saved &&
    (lessons.trim().length > 0 ||
      stirs.trim().length > 0 ||
      action.trim().length > 0);

  function save() {
    if (!canSave) return;
    const parts: string[] = [];
    if (lessons.trim()) parts.push(`Lessons: ${lessons.trim()}`);
    if (stirs.trim()) parts.push(`Reflection: ${stirs.trim()}`);
    if (action.trim()) parts.push(`Action: ${action.trim()}`);
    addEntry({
      prompt: `Tadabbur on ${ayah.verseKey}`,
      body: parts.join("\n\n"),
      context: { kind: "tadabbur", ref: ayah.verseKey },
    });
    track({ type: "journal_save", context: "tadabbur" });
    setLessons("");
    setStirs("");
    setAction("");
    setSaved(true);
  }

  return (
    <div
      className="card stack"
      style={{ background: "var(--surface-2)", borderColor: "var(--line-strong)" }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>
        Your tadabbur
      </p>
      <p className="muted" style={{ margin: 0, fontSize: ".9rem" }}>
        Sit with {name} {ayah.verseKey} — write as little or as much as you
        like.
      </p>
      <label className="stack" style={{ gap: 4 }}>
        <span className="soft" style={{ fontSize: ".9rem" }}>
          What does it teach?
        </span>
        <textarea
          rows={2}
          value={lessons}
          onChange={(e) => {
            setLessons(e.target.value);
            setSaved(false);
          }}
          style={textareaStyle}
        />
      </label>
      <label className="stack" style={{ gap: 4 }}>
        <span className="soft" style={{ fontSize: ".9rem" }}>
          What does it stir in you?
        </span>
        <textarea
          rows={2}
          value={stirs}
          onChange={(e) => {
            setStirs(e.target.value);
            setSaved(false);
          }}
          style={textareaStyle}
        />
      </label>
      <label className="stack" style={{ gap: 4 }}>
        <span className="soft" style={{ fontSize: ".9rem" }}>
          What will you do?
        </span>
        <textarea
          rows={2}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setSaved(false);
          }}
          style={textareaStyle}
        />
      </label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn secondary" onClick={save} disabled={!canSave}>
          Save reflection
        </button>
        {saved && (
          <span className="muted" role="status">
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

type LoadStatus = "loading" | "ready" | "error";

export default function SurahTadabbur() {
  const { surah } = useParams<{ surah: string }>();
  const [params] = useSearchParams();
  const surahNumber = Number(surah);
  const validSurah =
    Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [indexed, setIndexed] = useState<number[]>([]);
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [info, setInfo] = useState<SurahInfo | null>(null);
  const [tafsir, setTafsir] = useState<SurahTafsir | null>(null);
  const tafsirPromise = useRef<Promise<SurahTafsir> | null>(null);

  /** -1 = about screen, 0..count-1 = a verse, count = completion. */
  const [phase, setPhase] = useState(-1);
  const [started, setStarted] = useState(false);
  const reduce = useMemo(prefersReducedMotion, []);
  const saved = useMemo(
    () => (validSurah ? getSurahTadabbur(surahNumber) : undefined),
    [validSurah, surahNumber]
  );

  useEffect(() => {
    if (!validSurah) return;
    let active = true;
    setStatus("loading");
    setPhase(-1);
    setStarted(false);
    setTafsir(null);
    tafsirPromise.current = null;
    setInfo(null);

    Promise.all([
      loadSurahAyahs(surahNumber),
      loadTafsirIndex().catch<Record<string, number[]>>(() => ({})),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, indexData, surahList]) => {
        if (!active) return;
        setAyahs(ayahData);
        setIndexed(indexData[String(surahNumber)] ?? []);
        setMeta(surahList.find((s) => s.number === surahNumber));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    fetch(`/data/info/${surahNumber}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SurahInfo | null) => {
        if (active && d) setInfo(d);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [validSurah, surahNumber]);

  const name = meta?.name ?? `Surah ${surahNumber}`;

  useEffect(() => {
    document.title = validSurah
      ? `${name} · Tadabbur — MindfulVerse`
      : "Tadabbur — MindfulVerse";
  }, [validSurah, name]);

  // Deep link (?v=n): start straight at that verse once the surah loads.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (status !== "ready" || deepLinked.current) return;
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
    if (status !== "ready" || phase < 0 || ayahs.length === 0) return;
    const a = ayahs[Math.min(phase, ayahs.length - 1)];
    recordSurahTadabbur(surahNumber, a.ayah);
  }, [phase, status, ayahs, surahNumber]);

  const mounted = useMounted(phase);

  function begin(at: number) {
    if (!started) {
      track({ type: "session_start", sessionId: `surah-${surahNumber}` });
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
            Surahs run from 1 to 114 — we couldn’t find the one this link
            points to.
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
      saved != null && saved.ayah >= 1 && saved.ayah <= count
        ? saved.ayah
        : null;
    return (
      <div className="stack">
        <Link to="/sessions" className="muted">
          All tadabbur
        </Link>
        <FadeRise show={mounted} reduce={reduce}>
          <div className="stack">
            <p className="eyebrow">Tadabbur</p>
            <h1 style={{ margin: 0 }}>{name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {count} {count === 1 ? "verse" : "verses"}, one at a time.
            </p>
          </div>
        </FadeRise>
        {info && (
          <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
            <div className="card stack">
              <p className="eyebrow" style={{ margin: 0 }}>
                About this surah
              </p>
              <InfoText text={info.text} />
            </div>
          </FadeRise>
        )}
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 120}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {resumeAyah != null ? (
              <>
                <button className="btn" onClick={() => begin(resumeAyah - 1)}>
                  Continue from verse {resumeAyah}
                </button>
                <button className="btn ghost" onClick={() => begin(0)}>
                  Start from verse 1
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => begin(0)}>
                Begin pondering
              </button>
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
            <p className="eyebrow">Tadabbur</p>
            <h1 style={{ margin: 0 }}>You’ve sat with all of {name}.</h1>
            <p className="soft">
              {count} {count === 1 ? "verse" : "verses"}, pondered at your own
              pace. May what you wrote stay with you.
            </p>
          </div>
        </FadeRise>
        <FadeRise show={mounted} reduce={reduce} delay={reduce ? 0 : 60}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
      <Link to="/sessions" className="muted">
        All tadabbur
      </Link>

      <p className="eyebrow" aria-live="polite">
        Verse {phase + 1} of {count}
      </p>

      <FadeRise key={phase} show={mounted} reduce={reduce}>
        <div className="stack">
          <div className="verse" style={{ paddingTop: 0 }}>
            <div className="verse-head">
              <span className="roundel">{a.ayah}</span>
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
          />

          <ReflectionArea key={a.verseKey} ayah={a} name={name} />
        </div>
      </FadeRise>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn secondary"
          onClick={() => setPhase((p) => Math.max(-1, p - 1))}
        >
          Back
        </button>
        <button className="btn" onClick={() => setPhase((p) => p + 1)}>
          {phase + 1 === count ? "Finish" : "Next verse"}
        </button>
      </div>
    </div>
  );
}
