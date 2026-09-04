import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadSurahs } from "../lib/data";
import { getLastRead } from "../lib/progress";
import type { SurahMeta } from "../lib/types";

type Status = "loading" | "ready" | "error";

export default function Reader() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const lastRead = useMemo(() => getLastRead(), []);

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
        <p className="muted">Browse all 114 surahs.</p>
        <p style={{ margin: "10px 0 0", display: "flex", gap: 18 }}>
          <Link to="/search">Search the translation</Link>
          <Link to="/themes">Browse by theme</Link>
        </p>
      </header>

      {lastRead && (
        <Link
          to={`/read/${lastRead.surah}?v=${lastRead.ayah}`}
          className="card"
          style={{ display: "block", color: "var(--ink)" }}
        >
          <span className="label" style={{ display: "block" }}>
            Continue reading
          </span>
          <span style={{ fontWeight: 650 }}>
            {surahs.find((s) => s.number === lastRead.surah)?.name ??
              `Surah ${lastRead.surah}`}{" "}
            · verse {lastRead.ayah}
          </span>
        </Link>
      )}

      {status === "loading" && <p className="muted">Loading surahs…</p>}

      {status === "error" && (
        <div className="card">
          <p className="muted">
            Content is being prepared. Please check back soon.
          </p>
        </div>
      )}

      {status === "ready" && (
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
    </div>
  );
}
