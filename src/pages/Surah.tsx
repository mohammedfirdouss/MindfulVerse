import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { loadSurahAyahs, loadSurahs, loadTafsirIndex } from "../lib/data";
import { track } from "../lib/analytics";
import { recordLastRead } from "../lib/progress";
import { shareVerse } from "../lib/share";
import type { Ayah, SurahMeta } from "../lib/types";
import {
  CommentarySheet,
  coveringFor,
  commentaryLabel,
  useTafsir,
  type TafsirIndex,
} from "../components/Commentary";

type Status = "loading" | "ready" | "error";

/** Every surah except Al-Fatihah (1, where it is ayah 1) and At-Tawbah (9)
 *  opens with the basmalah in the mushaf. */
const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const SIZES: { key: string; label: string; scale: number }[] = [
  { key: "s", label: "A", scale: 0.86 },
  { key: "m", label: "A", scale: 1 },
  { key: "l", label: "A", scale: 1.22 },
];
const SIZE_KEY = "mindfulverse.readScale.v1";
const VIEW_KEY = "mindfulverse.readView.v1";

type ReadView = "arabic" | "both";

// Keyed on the surah so moving to the next one starts from clean state — an
// in-flight tafsir fetch can't land on the wrong surah.
export default function Surah() {
  const { surah } = useParams<{ surah: string }>();
  return <SurahReader key={surah} />;
}

function SurahReader() {
  const { surah } = useParams<{ surah: string }>();
  const [params] = useSearchParams();
  const surahNumber = Number(surah);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [index, setIndex] = useState<TafsirIndex | null>(null);
  const tafsir = useTafsir();
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [status, setStatus] = useState<Status>("loading");
  const [openAyah, setOpenAyah] = useState<Ayah | null>(null);
  const [sizeKey, setSizeKey] = useState<string>(
    () => localStorage.getItem(SIZE_KEY) ?? "m"
  );
  const [jump, setJump] = useState<string>("");
  const [view, setView] = useState<ReadView>(() =>
    localStorage.getItem(VIEW_KEY) === "arabic" ? "arabic" : "both"
  );
  const [shared, setShared] = useState<{ key: string; label: string } | null>(null);
  const sharedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    // The tafsir text itself (up to 1.3MB for long surahs) is NOT loaded here —
    // only a ~6KB index of which ayahs have entries. Text loads on first tap.
    Promise.all([
      loadSurahAyahs(surahNumber),
      loadTafsirIndex().catch<Record<string, number[]> | null>(() => null),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, indexData, surahList]) => {
        if (!active) return;
        setAyahs(ayahData);
        setIndex(indexData);
        setMeta(surahList.find((s) => s.number === surahNumber));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [surahNumber]);

  useEffect(() => {
    if (meta) document.title = `${meta.name} — MindfulVerse`;
    else document.title = "Read — MindfulVerse";
  }, [meta]);

  // Deep link (?v=n): scroll there once the surah renders.
  useEffect(() => {
    if (status !== "ready") return;
    const v = Number(params.get("v"));
    if (!Number.isFinite(v) || v < 1) return;
    const el = document.getElementById(`v${v}`);
    if (el) {
      el.scrollIntoView({ block: "start" });
      recordLastRead(surahNumber, v);
    }
  }, [status, params, surahNumber]);

  // Track reading position: the topmost visible verse becomes "last read".
  useEffect(() => {
    if (status !== "ready") return;
    let timer: number | undefined;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number(e.target.id.slice(1));
          if (e.isIntersecting) visible.add(n);
          else visible.delete(n);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (visible.size > 0) {
            recordLastRead(surahNumber, Math.min(...visible));
          }
        }, 800);
      },
      { rootMargin: "0px 0px -60% 0px" }
    );
    document.querySelectorAll("article.verse").forEach((el) => observer.observe(el));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [status, surahNumber]);

  useEffect(() => () => window.clearTimeout(sharedTimer.current), []);

  async function share(a: Ayah) {
    const result = await shareVerse(a, "reader");
    if (result === "cancelled" || result === "failed") return;
    window.clearTimeout(sharedTimer.current);
    setShared({ key: a.verseKey, label: result === "copied" ? "Copied ✓" : "Shared ✓" });
    sharedTimer.current = window.setTimeout(() => setShared(null), 2000);
  }

  function chooseSize(key: string) {
    setSizeKey(key);
    localStorage.setItem(SIZE_KEY, key);
  }

  function chooseView(v: ReadView) {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
    track({ type: "read_view", view: v });
  }

  function goToVerse(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(jump);
    if (!Number.isFinite(n)) return;
    const el = document.getElementById(`v${n}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      recordLastRead(surahNumber, n);
    }
  }

  const scale = SIZES.find((s) => s.key === sizeKey)?.scale ?? 1;

  return (
    <div style={{ ["--read-scale" as string]: String(scale) }}>
      <header style={{ marginBottom: 12 }}>
        <Link to="/read" className="btn ghost">
          ← All surahs
        </Link>
        <h1 style={{ marginTop: 14 }}>{meta ? meta.name : `Surah ${surahNumber}`}</h1>
        {meta && (
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {meta.ayahCount} verses
          </p>
        )}
      </header>

      {status === "ready" && ayahs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            padding: "10px 0 16px",
            borderBottom: "1px solid var(--line)",
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div className="reading-controls" role="group" aria-label="Reading size">
              {SIZES.map((s, i) => (
                <button
                  key={s.key}
                  className="size-btn"
                  aria-pressed={s.key === sizeKey}
                  onClick={() => chooseSize(s.key)}
                  style={{ fontSize: `${0.78 + i * 0.16}rem` }}
                  aria-label={`Reading size ${s.key === "s" ? "small" : s.key === "m" ? "medium" : "large"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="reading-controls" role="group" aria-label="Reading view">
              <button
                className="size-btn"
                aria-pressed={view === "arabic"}
                onClick={() => chooseView("arabic")}
              >
                Arabic
              </button>
              <button
                className="size-btn"
                aria-pressed={view === "both"}
                onClick={() => chooseView("both")}
              >
                With translation
              </button>
            </div>
          </div>
          <form onSubmit={goToVerse} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={meta?.ayahCount ?? 300}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              placeholder="Verse"
              aria-label="Jump to verse number"
              className="field-input"
              style={{ width: 76, padding: "7px 10px", fontSize: ".9rem" }}
            />
            <button type="submit" className="btn secondary" style={{ padding: "7px 14px" }}>
              Go
            </button>
          </form>
        </div>
      )}

      {status === "loading" && <p className="muted">Loading…</p>}

      {status === "error" && (
        <div className="card">
          <p className="soft" style={{ margin: 0 }}>
            This surah isn’t ready to read yet. Please check back soon.
          </p>
        </div>
      )}

      {status === "ready" && (
        <div>
          {surahNumber !== 1 && surahNumber !== 9 && (
            <p
              className="arabic"
              lang="ar"
              style={{ textAlign: "center", padding: "18px 0 4px" }}
            >
              {BASMALAH}
            </p>
          )}
          {ayahs.map((a) => {
            const covering = coveringFor(index, a);
            return (
              <article
                key={a.verseKey}
                id={`v${a.ayah}`}
                className="verse"
                style={{ scrollMarginTop: 16 }}
              >
                <div className="verse-head">
                  <span className="roundel">{a.ayah}</span>
                  <span className="rule" />
                </div>
                <p className="arabic" lang="ar">
                  {a.arabic}
                </p>
                {view === "both" && (
                  <>
                    <p className="translation">{a.translation}</p>
                    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        className="commentary-open"
                        disabled={covering === null}
                        onClick={() => setOpenAyah(a)}
                      >
                        {commentaryLabel(index, a)}
                      </button>
                      <button className="commentary-open" onClick={() => void share(a)}>
                        {shared?.key === a.verseKey ? shared.label : "Share"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
          {surahNumber < 114 && (
            <div style={{ padding: "28px 0 8px" }}>
              <Link to={`/read/${surahNumber + 1}`} className="btn secondary">
                Next surah
              </Link>
            </div>
          )}
        </div>
      )}

      {openAyah && (
        <CommentarySheet
          ayah={openAyah}
          index={index}
          tafsir={tafsir}
          onClose={() => setOpenAyah(null)}
        />
      )}
    </div>
  );
}
