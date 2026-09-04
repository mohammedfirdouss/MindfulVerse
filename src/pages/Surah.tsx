import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadSurahAyahs, loadSurahTafsir, loadSurahs } from "../lib/data";
import type { Ayah, SurahMeta, SurahTafsir } from "../lib/types";

type Status = "loading" | "ready" | "error";

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

  const openText = openAyah ? tafsir[String(openAyah.ayah)] : undefined;

  return (
    <div>
      <header style={{ marginBottom: 8 }}>
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
              <article key={a.verseKey} className="verse">
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
