import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadDivisions, loadSurahs } from "../lib/data";
import { getLastRead } from "../lib/progress";
import type { Division, SurahMeta } from "../lib/types";

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
          className="card"
          style={{ display: "block", color: "var(--ink)" }}
        >
          <span className="eyebrow" style={{ display: "block" }}>
            Continue reading
          </span>
          <span style={{ fontWeight: 650 }}>
            {surahs.find((s) => s.number === lastRead.surah)?.name ??
              `Surah ${lastRead.surah}`}{" "}
            · verse {lastRead.ayah}
          </span>
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
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              font: "inherit",
            }}
          />

          {filtered.length === 0 ? (
            <p className="muted">No surahs match “{query}”.</p>
          ) : (
            <div className="stack">
              {filtered.map((s) => (
                <Link
                  key={s.number}
                  to={`/read/${s.number}`}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    color: "var(--ink)",
                  }}
                >
                  <span
                    className="eyebrow"
                    style={{ minWidth: 36, textAlign: "center" }}
                  >
                    {s.number}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 650, display: "block" }}>
                      {s.name}
                    </span>
                    <span className="muted" style={{ fontSize: ".9rem" }}>
                      {s.ayahCount} {s.ayahCount === 1 ? "ayah" : "ayahs"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
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
        <div className="stack">
          {juzList.map((j) => {
            const [fs, fa] = j.first.split(":").map(Number);
            const [ls, la] = j.last.split(":").map(Number);
            const name = (s: number) => surahs.find((x) => x.number === s)?.name ?? `Surah ${s}`;
            const hizbs = hizbList.filter((h) => h.n === j.n * 2 - 1 || h.n === j.n * 2);
            return (
              <div key={j.n} className="card juz-card">
                <Link to={`/read/juz/${j.n}`} className="juz-main">
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 650, display: "block" }}>Juz {j.n}</span>
                    <span className="muted juz-range">
                      <span>{name(fs)} {fa}</span> – <span>{name(ls)} {la}</span>
                    </span>
                  </span>
                  {j.opening && (
                    <span className="juz-opening" lang="ar" dir="rtl">
                      {j.opening}
                    </span>
                  )}
                </Link>
                <p className="juz-hizbs">
                  {hizbs.map((h) => (
                    <Link
                      key={h.n}
                      to={h.first === j.first ? `/read/juz/${j.n}` : `/read/juz/${j.n}?v=${h.first}`}
                    >
                      Hizb {h.n}
                    </Link>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
