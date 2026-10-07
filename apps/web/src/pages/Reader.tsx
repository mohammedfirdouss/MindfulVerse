import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadDivisions, loadSurahs } from "@mindfulverse/core/data";
import { getLastRead } from "@mindfulverse/core/progress";
import type { Division, SurahMeta } from "@mindfulverse/core/types";
import { arabicSurahName, revelationPlace } from "@mindfulverse/core/surahNames";
import { ChevronIcon, Diamond } from "../components/Adire";
import "./reader.css";

type Status = "loading" | "ready" | "error";

export default function Reader() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const lastRead = useMemo(() => getLastRead(), []);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "juz" ? "juz" : "surah";
  const [juzList, setJuzList] = useState<Division[]>([]);
  const [hizbList, setHizbList] = useState<Division[]>([]);
  const [juzFailed, setJuzFailed] = useState(false);

  useEffect(() => {
    document.title = "Read — MindfulVerse";
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadSurahs()
      .then((data) => {
        if (!active) return;
        setSurahs(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadDivisions()
      .then((d) => {
        if (!active) return;
        setJuzList(d.juz);
        setHizbList(d.hizb);
      })
      .catch(() => active && setJuzFailed(true));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || String(s.number).includes(q)
    );
  }, [surahs, query]);

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Read</p>
        <h1>The Qur'an</h1>
        <p className="muted">Browse by surah or by juz.</p>
        <p style={{ margin: "10px 0 0", display: "flex", gap: 18 }}>
          <Link to="/search">Search the translation</Link>
          <Link to="/themes">Find verses by topic</Link>
        </p>
      </header>

      {lastRead && (
        <Link
          to={`/read/${lastRead.surah}?v=${lastRead.ayah}`}
          className="cloth continue-cloth"
        >
          <span className="continue-text">
            <span className="cloth-eyebrow">Continue reading</span>
            <span className="continue-name">
              {surahs.find((s) => s.number === lastRead.surah)?.name ??
                `Surah ${lastRead.surah}`}
            </span>
            <span className="cloth-soft">Verse {lastRead.ayah}</span>
          </span>
          <ChevronIcon />
        </Link>
      )}

      <div className="reading-controls" role="group" aria-label="Browse by">
        {(["surah", "juz"] as const).map((t) => (
          <button
            key={t}
            className="size-btn"
            aria-pressed={tab === t}
            onClick={() => setParams(t === "surah" ? {} : { tab: t }, { replace: true })}
          >
            {t === "surah" ? "Surah" : "Juz"}
          </button>
        ))}
      </div>

      {tab === "surah" && status === "loading" && (
        <p className="muted">Loading surahs…</p>
      )}

      {tab === "surah" && status === "error" && (
        <div className="card">
          <p className="muted">
            Content is being prepared. Please check back soon.
          </p>
        </div>
      )}

      {tab === "surah" && status === "ready" && (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number…"
            aria-label="Search surahs"
            className="index-search"
          />

          {filtered.length === 0 ? (
            <p className="muted">No surahs match “{query}”.</p>
          ) : (
            <ul className="index-list">
              {filtered.map((s) => {
                const place = revelationPlace(s.number);
                const arabic = arabicSurahName(s.number);
                return (
                  <li key={s.number}>
                    <Link to={`/read/${s.number}`} className="index-row">
                      <Diamond n={s.number} outline />
                      <span className="row-text">
                        <span className="read-sr">Surah {s.number}, </span>
                        <span className="row-title">{s.name}</span>
                        <span className="row-meta">
                          {place ? `${place} · ` : ""}
                          {s.ayahCount} {s.ayahCount === 1 ? "ayah" : "ayahs"}
                        </span>
                      </span>
                      {arabic && (
                        <span className="row-arabic" lang="ar" dir="rtl" aria-hidden="true">
                          {arabic}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === "juz" && juzFailed && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Juz browsing isn’t available right now.</p>
        </div>
      )}

      {tab === "juz" && !juzFailed && juzList.length === 0 && (
        <p className="muted">Loading juz…</p>
      )}

      {tab === "juz" && !juzFailed && juzList.length > 0 && (
        <ul className="index-list">
          {juzList.map((j) => {
            const [fs, fa] = j.first.split(":").map(Number);
            const [ls, la] = j.last.split(":").map(Number);
            const name = (s: number) => surahs.find((x) => x.number === s)?.name ?? `Surah ${s}`;
            const hizbs = hizbList.filter((h) => h.n === j.n * 2 - 1 || h.n === j.n * 2);
            return (
              <li key={j.n} className="juz-row">
                <Link to={`/read/juz/${j.n}`} className="index-row">
                  <span className="row-head">
                    <Diamond n={j.n} />
                    <span className="row-text">
                      <span className="row-title">Juz {j.n}</span>
                      <span className="row-meta">
                        <span>{name(fs)} {fa}</span> – <span>{name(ls)} {la}</span>
                      </span>
                    </span>
                  </span>
                  {j.opening && (
                    <span className="juz-open" lang="ar" dir="rtl">
                      {j.opening}
                    </span>
                  )}
                </Link>
                <p className="hizb-pills">
                  {hizbs.map((h) => (
                    <Link
                      key={h.n}
                      className="hizb-pill"
                      to={h.first === j.first ? `/read/juz/${j.n}` : `/read/juz/${j.n}?v=${h.first}`}
                    >
                      Hizb {h.n}
                    </Link>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
