import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadSurahAyahs, loadSurahTafsir, loadSurahs } from "../lib/data";
import type { Ayah, SurahMeta, SurahTafsir } from "../lib/types";

type Status = "loading" | "ready" | "error";

function TafsirDisclosure({ text }: { text: string }) {
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <details style={{ marginTop: 12 }}>
      <summary
        style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 600 }}
      >
        Commentary (Ibn Kathir)
      </summary>
      <div className="tafsir" style={{ marginTop: 8 }}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}

export default function Surah() {
  const { surah } = useParams<{ surah: string }>();
  const surahNumber = Number(surah);

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [tafsir, setTafsir] = useState<SurahTafsir>({});
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [status, setStatus] = useState<Status>("loading");

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

  return (
    <div className="stack">
      <header>
        <Link to="/read" className="btn ghost" style={{ paddingLeft: 0 }}>
          ← All surahs
        </Link>
        <p className="eyebrow" style={{ marginTop: 8 }}>
          Surah {surahNumber}
        </p>
        <h1>{meta ? meta.name : `Surah ${surahNumber}`}</h1>
      </header>

      {status === "loading" && <p className="muted">Loading surah…</p>}

      {status === "error" && (
        <div className="card">
          <p className="muted">
            Content is being prepared. Please check back soon.
          </p>
        </div>
      )}

      {status === "ready" && (
        <div className="stack">
          {ayahs.map((a) => {
            const tafsirText = tafsir[String(a.ayah)];
            return (
              <article key={a.verseKey} className="card">
                <p className="eyebrow">Ayah {a.ayah}</p>
                <p className="arabic">{a.arabic}</p>
                <p className="translation">{a.translation}</p>
                {tafsirText ? <TafsirDisclosure text={tafsirText} /> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
