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

/** Ibn Kathir comments on passages, not single verses: a run of ayahs stores
 *  its commentary under the first ayah of the group. For an ayah with no
 *  direct entry, its commentary is the nearest preceding entry. */
function coveringTafsirAyah(tafsir: SurahTafsir, ayah: number): number | null {
  for (let n = ayah; n >= 1; n--) {
    if (tafsir[String(n)]) return n;
  }
  return null;
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
  sourceAyah,
  onClose,
}: {
  ayah: Ayah;
  text: string;
  /** Where the commentary actually lives when it covers a passage. */
  sourceAyah: number;
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
              {sourceAyah === ayah.ayah
                ? `Ibn Kathir · ${ayah.surah}:${ayah.ayah}`
                : `Ibn Kathir · on the passage from ${ayah.surah}:${sourceAyah}`}
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

    // Surah info is optional enrichment — ignore failures quietly.
    fetch(`/data/info/${surahNumber}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SurahInfo | null) => {
        if (active && d) setInfo(d);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [surahNumber]);

  async function share(a: Ayah) {
    const result = await shareVerse(a, "reader");
    setShared(a.verseKey);
    if (result === "failed") setShared(null);
    setTimeout(() => setShared(null), 2000);
  }

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
  const openCovering = openAyah ? coveringTafsirAyah(tafsir, openAyah.ayah) : null;
  const openText = openCovering !== null ? tafsir[String(openCovering)] : undefined;

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
        {info && (
          <details style={{ marginTop: 12 }}>
            <summary
              style={{ cursor: "pointer", color: "var(--kola)", fontWeight: 500 }}
            >
              About this surah
            </summary>
            <div className="tafsir" style={{ marginTop: 10 }}>
              {info.text
                .split("\n\n")
                .map((p) => p.trim())
                .filter(Boolean)
                .slice(0, 24)
                .map((p, i) =>
                  p.length < 60 && !p.includes(".") ? (
                    <h3 key={i}>{p}</h3>
                  ) : (
                    <p key={i}>{p}</p>
                  )
                )}
            </div>
          </details>
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
          {surahNumber !== 1 && surahNumber !== 9 && (
            <p
              className="arabic"
              style={{ textAlign: "center", padding: "18px 0 4px" }}
            >
              {BASMALAH}
            </p>
          )}
          {ayahs.map((a) => {
            const covering = coveringTafsirAyah(tafsir, a.ayah);
            const direct = covering === a.ayah;
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
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="commentary-open"
                    disabled={covering === null}
                    onClick={() => setOpenAyah(a)}
                  >
                    {covering === null
                      ? "No commentary for this verse"
                      : direct
                        ? "Read the commentary"
                        : `Read the commentary (with verse ${covering})`}
                  </button>
                  <button className="commentary-open" onClick={() => void share(a)}>
                    {shared === a.verseKey ? "Shared ✓" : "Share"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {openAyah && openText && openCovering !== null && (
        <CommentarySheet
          ayah={openAyah}
          text={openText}
          sourceAyah={openCovering}
          onClose={() => setOpenAyah(null)}
        />
      )}
    </div>
  );
}
