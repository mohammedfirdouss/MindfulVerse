import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadSurahAyahs, loadSurahTafsir, loadSurahs } from "../lib/data";
import { shareVerse } from "../lib/share";
import type { Ayah, SurahMeta, SurahTafsir } from "../lib/types";

type Status = "loading" | "ready" | "error";

/** Every surah except Al-Fatihah (1, where it is ayah 1) and At-Tawbah (9)
 *  opens with the basmalah in the mushaf. */
const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

interface SurahInfo {
  surah: number;
  name: string;
  text: string;
}

const SIZES: { key: string; label: string; scale: number }[] = [
  { key: "s", label: "A", scale: 0.86 },
  { key: "m", label: "A", scale: 1 },
  { key: "l", label: "A", scale: 1.22 },
];
const SIZE_KEY = "mindfulverse.readScale.v1";

/** Commentary opens here — its own scroll space, so a very long Ibn Kathir
 *  entry never pushes the reading page around. The ayah stays pinned for context. */
function CommentarySheet({
  ayah,
  text,
  onClose,
}: {
  ayah: Ayah;
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Commentary on verse ${ayah.verseKey}`}
      >
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div>
            <p className="arabic">{ayah.arabic}</p>
            <p className="label" style={{ margin: 0 }}>
              Ibn Kathir · {ayah.surah}:{ayah.ayah}
            </p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close commentary">
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <div className="tafsir">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Surah() {
  const { surah } = useParams<{ surah: string }>();
  const surahNumber = Number(surah);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [tafsir, setTafsir] = useState<SurahTafsir>({});
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [status, setStatus] = useState<Status>("loading");
  const [openAyah, setOpenAyah] = useState<Ayah | null>(null);
  const [sizeKey, setSizeKey] = useState<string>(
    () => localStorage.getItem(SIZE_KEY) ?? "m"
  );
  const [jump, setJump] = useState<string>("");
  const [info, setInfo] = useState<SurahInfo | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    Promise.all([
      loadSurahAyahs(surahNumber),
      loadSurahTafsir(surahNumber).catch<SurahTafsir>(() => ({})),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, tafsirData, surahList]) => {
        if (!active) return;
        setAyahs(ayahData);
        setTafsir(tafsirData);
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

  function chooseSize(key: string) {
    setSizeKey(key);
    localStorage.setItem(SIZE_KEY, key);
  }

  function goToVerse(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(jump);
    if (!Number.isFinite(n)) return;
    const el = document.getElementById(`v${n}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const scale = SIZES.find((s) => s.key === sizeKey)?.scale ?? 1;
  const openText = openAyah ? tafsir[String(openAyah.ayah)] : undefined;

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
          <form onSubmit={goToVerse} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={1}
              max={meta?.ayahCount ?? 300}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              placeholder="Verse"
              aria-label="Jump to verse number"
              style={{
                width: 76,
                padding: "7px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--paper-raised)",
                color: "var(--ink)",
                font: "inherit",
                fontSize: ".9rem",
              }}
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
          {ayahs.map((a) => {
            const hasTafsir = Boolean(tafsir[String(a.ayah)]);
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
                <p className="arabic">{a.arabic}</p>
                <p className="translation">{a.translation}</p>
                <button
                  className="commentary-open"
                  disabled={!hasTafsir}
                  onClick={() => setOpenAyah(a)}
                >
                  {hasTafsir ? "Read the commentary" : "No commentary for this verse"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {openAyah && openText && (
        <CommentarySheet ayah={openAyah} text={openText} onClose={() => setOpenAyah(null)} />
      )}
    </div>
  );
}
