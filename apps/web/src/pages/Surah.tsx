import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { loadSurahAyahs, loadSurahs, loadTafsirIndex } from "@mindfulverse/core/data";
import { recordLastRead } from "@mindfulverse/core/progress";
import type { Ayah, SurahMeta } from "@mindfulverse/core/types";
import {
  CommentarySheet,
  useTafsir,
  type TafsirIndex,
} from "../components/Commentary";
import ReadingControls from "../components/ReadingControls";
import ReadingText, { BASMALAH } from "../components/ReadingText";
import VerseBlock from "../components/VerseBlock";
import VerseSheet from "../components/VerseSheet";
import { verseId } from "@mindfulverse/core/divisions";
import {
  getReadView,
  getSizeKey,
  saveReadView,
  saveSizeKey,
  scaleFor,
  type ReadView,
} from "@mindfulverse/core/readingPrefs";
import { useLastReadTracker } from "../lib/useLastReadTracker";
import { DyeRule, TitlePlate } from "../components/Adire";
import "./reader.css";

type Status = "loading" | "ready" | "error";

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
  const [jump, setJump] = useState<string>("");
  const [view, setView] = useState<ReadView>(getReadView);
  const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);

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

  // Deep link (?v=n): scroll there once the surah renders, in either view.
  useEffect(() => {
    if (status !== "ready") return;
    const v = Number(params.get("v"));
    if (!Number.isFinite(v) || v < 1) return;
    const el = document.getElementById(view === "reading" ? verseId(surahNumber, v) : `v${v}`);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    recordLastRead(surahNumber, v);
    setFlashKey(`${surahNumber}:${v}`);
    const t = window.setTimeout(() => setFlashKey(null), 1600);
    return () => window.clearTimeout(t);
  }, [status, params, surahNumber, view]);

  useLastReadTracker(status === "ready", surahNumber, view);

  function chooseView(v: ReadView) {
    setView(v);
    saveReadView(v);
  }

  function chooseSize(k: string) {
    setSizeKey(k);
    saveSizeKey(k);
  }

  function goToVerse(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(jump);
    if (!Number.isFinite(n)) return;
    const el = document.getElementById(view === "reading" ? verseId(surahNumber, n) : `v${n}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      recordLastRead(surahNumber, n);
    }
  }

  return (
    <div style={{ ["--read-scale" as string]: String(scaleFor(sizeKey)) }}>
      <Link to="/read" className="btn ghost">
        ← All surahs
      </Link>
      <div className="surah-plate">
        <TitlePlate
          surah={surahNumber}
          name={meta ? meta.name : `Surah ${surahNumber}`}
          ayahCount={meta?.ayahCount}
        />
      </div>

      {status === "ready" && ayahs.length > 0 && (
        <div className="surah-toolbar">
          <ReadingControls sizeKey={sizeKey} onSize={chooseSize} view={view} onView={chooseView} />
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
          {view === "reading" ? (
            <>
              {surahNumber !== 1 && surahNumber !== 9 && <DyeRule className="reading-rule" />}
              <ReadingText
                ayahs={ayahs}
                headings={false}
                activeKey={selected?.verseKey ?? flashKey}
                onSelect={setSelected}
              />
            </>
          ) : (
            <>
              {surahNumber !== 1 && surahNumber !== 9 && (
                <div className="surah-opening">
                  <DyeRule />
                  <p className="arabic" lang="ar">
                    {BASMALAH}
                  </p>
                </div>
              )}
              {ayahs.map((a) => (
                <VerseBlock
                  key={a.verseKey}
                  ayah={a}
                  id={`v${a.ayah}`}
                  index={index}
                  onCommentary={setOpenAyah}
                  flash={flashKey === a.verseKey}
                />
              ))}
            </>
          )}
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

      {selected && (
        <VerseSheet ayah={selected} index={index} tafsir={tafsir} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
