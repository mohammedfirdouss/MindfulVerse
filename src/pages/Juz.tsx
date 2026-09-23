import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CommentarySheet, useTafsir, type TafsirIndex } from "../components/Commentary";
import ReadingControls from "../components/ReadingControls";
import ReadingText, { BASMALAH } from "../components/ReadingText";
import VerseBlock from "../components/VerseBlock";
import VerseSheet from "../components/VerseSheet";
import { loadDivisions, loadSurahAyahs, loadSurahs, loadTafsirIndex } from "../lib/data";
import { juzOf, makeMarks, spansInRange, verseId, type Marks } from "../lib/divisions";
import { recordLastRead } from "../lib/progress";
import {
  getReadView,
  getSizeKey,
  saveReadView,
  saveSizeKey,
  scaleFor,
  type ReadView,
} from "../lib/readingPrefs";
import type { Ayah, Division } from "../lib/types";
import { useLastReadTracker } from "../lib/useLastReadTracker";

// Keyed on the juz so moving to the next one starts from clean state.
export default function Juz() {
  const { n } = useParams<{ n: string }>();
  return <JuzReader key={n} />;
}

function JuzReader() {
  const { n } = useParams<{ n: string }>();
  const juz = Number(n);
  const [params] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [range, setRange] = useState<Division | null>(null);
  const [hizbs, setHizbs] = useState<Division[]>([]);
  const [marks, setMarks] = useState<Marks | null>(null);
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  const [index, setIndex] = useState<TafsirIndex | null>(null);
  const [missing, setMissing] = useState<number[]>([]);
  const [view, setView] = useState<ReadView>(getReadView);
  const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [openAyah, setOpenAyah] = useState<Ayah | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const tafsir = useTafsir();

  useEffect(() => {
    document.title = `Juz ${juz} — MindfulVerse`;
  }, [juz]);

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) {
      setStatus("error");
      return;
    }
    (async () => {
      try {
        const [divs, surahs, idx] = await Promise.all([
          loadDivisions(),
          loadSurahs(),
          loadTafsirIndex().catch(() => null),
        ]);
        const r = divs.juz.find((j) => j.n === juz);
        if (!r) throw new Error(`juz ${juz}`);
        const counts = new Map(surahs.map((s) => [s.number, s.ayahCount]));
        const spans = spansInRange(r.first, r.last, counts);
        const slices = await Promise.all(
          spans.map((sp) =>
            loadSurahAyahs(sp.surah)
              .then((list) => list.filter((a) => a.ayah >= sp.from && a.ayah <= sp.to))
              .catch(() => null)
          )
        );
        if (!active) return;
        setRange(r);
        setHizbs(divs.hizb.filter((h) => juzOf(h.first, divs) === juz));
        setMarks(makeMarks(divs));
        setSurahNames(new Map(surahs.map((s) => [s.number, s.name])));
        setIndex(idx);
        setMissing(spans.filter((_, i) => slices[i] === null).map((sp) => sp.surah));
        setAyahs(slices.flatMap((s) => s ?? []));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [juz]);

  // Deep link (?v=S:A): scroll there in either view and glow briefly.
  useEffect(() => {
    if (status !== "ready") return;
    const key = params.get("v");
    if (!key || !/^\d+:\d+$/.test(key)) return;
    const [s, a] = key.split(":").map(Number);
    const el = document.getElementById(verseId(s, a));
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    recordLastRead(s, a);
    setFlashKey(key);
    const t = window.setTimeout(() => setFlashKey(null), 1600);
    return () => window.clearTimeout(t);
  }, [status, params, view]);

  useLastReadTracker(status === "ready", null, view);

  function chooseView(v: ReadView) {
    setView(v);
    saveReadView(v);
  }
  function chooseSize(k: string) {
    setSizeKey(k);
    saveSizeKey(k);
  }

  const name = (s: number) => surahNames.get(s) ?? `Surah ${s}`;
  const rangeLabel = range
    ? (() => {
        const [fs, fa] = range.first.split(":").map(Number);
        const [ls, la] = range.last.split(":").map(Number);
        return `${name(fs)} ${fa} – ${name(ls)} ${la}`;
      })()
    : "";

  // Translation view: one heading per surah section.
  const sections: { surah: number; ayahs: Ayah[] }[] = [];
  for (const a of ayahs) {
    const last = sections[sections.length - 1];
    if (last && last.surah === a.surah) last.ayahs.push(a);
    else sections.push({ surah: a.surah, ayahs: [a] });
  }

  return (
    <div style={{ ["--read-scale" as string]: String(scaleFor(sizeKey)) }}>
      <header style={{ marginBottom: 12 }}>
        <Link to="/read?tab=juz" className="btn ghost">
          ← All juz
        </Link>
        <p className="eyebrow" style={{ marginTop: 14 }}>
          Juz
        </p>
        <h1 style={{ marginTop: 2 }}>Juz {juz}</h1>
        {range && (
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {rangeLabel}
          </p>
        )}
        {hizbs.length > 0 && (
          <p style={{ margin: "8px 0 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
            {hizbs.map((h) => (
              <Link key={h.n} to={`/read/juz/${juz}?v=${h.first}`} replace>
                Hizb {h.n}
              </Link>
            ))}
          </p>
        )}
      </header>

      {status === "ready" && (
        <div style={{ padding: "10px 0 16px", borderBottom: "1px solid var(--line)", marginBottom: 4 }}>
          <ReadingControls sizeKey={sizeKey} onSize={chooseSize} view={view} onView={chooseView} />
        </div>
      )}

      {status === "loading" && <p className="muted">Loading…</p>}

      {status === "error" && (
        <div className="card">
          <p className="soft" style={{ margin: 0 }}>
            This juz isn’t available right now. Please try again in a little while.
          </p>
        </div>
      )}

      {status === "ready" && missing.length > 0 && (
        <p className="soft" style={{ fontSize: ".9rem" }}>
          Part of this juz ({missing.map(name).join(", ")}) couldn’t be loaded right now.
        </p>
      )}

      {status === "ready" &&
        (view === "reading" ? (
          <ReadingText
            ayahs={ayahs}
            marks={marks}
            surahNames={surahNames}
            headings
            activeKey={selected?.verseKey ?? flashKey}
            onSelect={setSelected}
          />
        ) : (
          sections.map((sec) => (
            <section key={sec.surah}>
              <h2 className="reading-surah-name">
                <Link to={`/read/${sec.surah}`} style={{ color: "inherit" }}>
                  {name(sec.surah)}
                </Link>
                {sec.ayahs[0].ayah > 1 && <span className="muted"> · from verse {sec.ayahs[0].ayah}</span>}
              </h2>
              {sec.ayahs[0].ayah === 1 && sec.surah !== 1 && sec.surah !== 9 && (
                <p className="arabic" lang="ar" style={{ textAlign: "center", padding: "10px 0 4px" }}>
                  {BASMALAH}
                </p>
              )}
              {sec.ayahs.map((a) => (
                <VerseBlock
                  key={a.verseKey}
                  ayah={a}
                  id={verseId(a.surah, a.ayah)}
                  index={index}
                  onCommentary={setOpenAyah}
                  flash={flashKey === a.verseKey}
                />
              ))}
            </section>
          ))
        ))}

      {status === "ready" && juz < 30 && (
        <div style={{ padding: "28px 0 8px" }}>
          <Link to={`/read/juz/${juz + 1}`} className="btn secondary">
            Next juz
          </Link>
        </div>
      )}

      {selected && (
        <VerseSheet ayah={selected} index={index} tafsir={tafsir} onClose={() => setSelected(null)} />
      )}
      {openAyah && (
        <CommentarySheet ayah={openAyah} index={index} tafsir={tafsir} onClose={() => setOpenAyah(null)} />
      )}
    </div>
  );
}
