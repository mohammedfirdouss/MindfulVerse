import { surahPassages } from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  loadSurahAyahs,
  loadSurahs,
  loadTafsirIndex,
  loadThemes,
} from "@mindfulverse/core/data";
import { verseId } from "@mindfulverse/core/divisions";
import { recordLastRead } from "@mindfulverse/core/progress";
import {
  getReadView,
  getSizeKey,
  saveReadView,
  saveSizeKey,
  scaleFor,
} from "@mindfulverse/core/readingPrefs";
import type { ReadView } from "@mindfulverse/core/readingPrefs";
import type { Ayah, SurahMeta } from "@mindfulverse/core/types";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { DyeRule, TitlePlate } from "../components/Adire";
import BackLink from "../components/BackLink";
import { CommentarySheet, useTafsir } from "../components/Commentary";
import type { TafsirIndex } from "../components/Commentary";
import PassageMap, {
  PASSAGE_CREDIT,
  PassageHeading,
} from "../components/PassageMap";
import ReaderTools from "../components/ReaderTools";
import ReadingText, { BASMALAH } from "../components/ReadingText";
import VerseBlock from "../components/VerseBlock";
import VerseSheet from "../components/VerseSheet";
import { findVerseElement, useHoldVerse } from "../lib/useHoldVerse";
import { useLastReadTracker } from "../lib/useLastReadTracker";
import NotFound from "./NotFound";

import "./reader.css";

type Status = "loading" | "ready" | "error";

const SURAH_PARAM_RE = /^\d{1,3}$/u;
const SURAH_COUNT = 114;
const FLASH_MS = 1600;

// Keyed on the surah so moving to the next one starts from clean state — an
// in-flight tafsir fetch can't land on the wrong surah.
export default function Surah() {
  const { surah } = useParams<{ surah: string }>();
  const surahNumber = Number(surah);
  const isValid =
    SURAH_PARAM_RE.test(surah ?? "") &&
    surahNumber >= 1 &&
    surahNumber <= SURAH_COUNT;
  if (!isValid) {
    return <NotFound />;
  }
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
  const [view, setView] = useState<ReadView>(getReadView);
  const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  // Titled passages are a help, never a blocker: the surah reads without them.
  const [passages, setPassages] = useState<Passage[]>([]);

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
        if (!active) {
          return;
        }
        setAyahs(ayahData);
        setIndex(indexData);
        setMeta(surahList.find((s) => s.number === surahNumber));
        setStatus("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setStatus("error");
      });

    loadThemes()
      .then((themes) => {
        if (active) {
          setPassages(surahPassages(themes, surahNumber));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [surahNumber]);

  useEffect(() => {
    document.title = meta
      ? `${meta.name} | MindfulVerse`
      : "Read | MindfulVerse";
  }, [meta]);

  // Deep link (?v=n): scroll there once per navigation, in either view. The
  // guard keeps a view switch or a closing sheet from jumping back to it
  // (this component is keyed on the surah, so the guard resets with it).
  const jumpedTo = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    const raw = params.get("v");
    if (raw === jumpedTo.current) {
      return;
    }
    jumpedTo.current = raw;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 1) {
      return;
    }
    const el = findVerseElement(surahNumber, v, surahNumber);
    if (!el) {
      return;
    }
    el.scrollIntoView({ block: "start" });
    recordLastRead(surahNumber, v);
    setFlashKey(`${surahNumber}:${v}`);
  }, [status, params, surahNumber]);

  // The glow on a jumped-to verse fades by itself.
  useEffect(() => {
    if (flashKey === null) {
      return;
    }
    const t = window.setTimeout(() => setFlashKey(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [flashKey]);

  useLastReadTracker(status === "ready", surahNumber, view);
  const holdVerse = useHoldVerse(view, surahNumber);

  function chooseView(v: ReadView) {
    holdVerse();
    setView(v);
    saveReadView(v);
  }

  function chooseSize(k: string) {
    setSizeKey(k);
    saveSizeKey(k);
  }

  // Out-of-range numbers are caught in the jump sheet; a missing row is a no-op.
  function goToVerse(n: number) {
    const el = document.getElementById(
      view === "reading" ? verseId(surahNumber, n) : `v${n}`
    );
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    recordLastRead(surahNumber, n);
    setFlashKey(`${surahNumber}:${n}`);
  }

  // In the verse-by-verse view, land on the passage's heading so its title is
  // in sight; the reading view has no headings, so go to the verse.
  function goToPassage(from: number) {
    const heading =
      view === "reading" ? null : document.getElementById(`p${from}`);
    if (!heading) {
      goToVerse(from);
      return;
    }
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
    recordLastRead(surahNumber, from);
    setFlashKey(`${surahNumber}:${from}`);
  }

  return (
    <div style={{ ["--read-scale" as string]: String(scaleFor(sizeKey)) }}>
      <BackLink to="/read">All surahs</BackLink>
      <div className="surah-plate">
        <TitlePlate
          surah={surahNumber}
          name={meta ? meta.name : `Surah ${surahNumber}`}
          ayahCount={meta?.ayahCount}
        />
      </div>

      {status === "ready" && ayahs.length > 0 && (
        <div className="surah-toolbar">
          <ReaderTools
            sizeKey={sizeKey}
            onSize={chooseSize}
            view={view}
            onView={chooseView}
            maxVerse={meta?.ayahCount ?? ayahs.length}
            onJump={goToVerse}
          />
        </div>
      )}

      {status === "ready" && ayahs.length > 0 && (
        <PassageMap passages={passages} onJump={goToPassage} />
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
              {surahNumber !== 1 && surahNumber !== 9 && (
                <DyeRule className="reading-rule" />
              )}
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
                  <p className="arabic" lang="ar" dir="rtl">
                    {BASMALAH}
                  </p>
                </div>
              )}
              {ayahs.map((a) => {
                const starts = passages.find((p) => p.from === a.ayah);
                return (
                  <Fragment key={a.verseKey}>
                    {starts && <PassageHeading passage={starts} />}
                    <VerseBlock
                      ayah={a}
                      id={`v${a.ayah}`}
                      index={index}
                      onCommentary={setOpenAyah}
                      flash={flashKey === a.verseKey}
                    />
                  </Fragment>
                );
              })}
            </>
          )}
          {/* With two or more passages the credit sits in the map; a surah
              of one passage has no map, so its heading is credited here. */}
          {passages.length === 1 && (
            <p className="muted passage-credit">{PASSAGE_CREDIT}</p>
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
        <VerseSheet
          ayah={selected}
          index={index}
          tafsir={tafsir}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
