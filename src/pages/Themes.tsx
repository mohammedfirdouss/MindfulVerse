import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadThemes } from "../lib/data";
import type { Theme } from "../lib/types";

const PAGE_SIZE = 120;

interface ThemeGroup {
  theme: string;
  ranges: Theme[];
}

type Status =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; groups: ThemeGroup[] };

function groupByTheme(rows: Theme[]): ThemeGroup[] {
  const byName = new Map<string, Theme[]>();
  for (const row of rows) {
    const existing = byName.get(row.theme);
    if (existing) existing.push(row);
    else byName.set(row.theme, [row]);
  }
  return Array.from(byName, ([theme, ranges]) => ({ theme, ranges }));
}

function rangeLabel(r: Theme): string {
  return r.ayahFrom === r.ayahTo
    ? `Surah ${r.surah} · ${r.ayahFrom}`
    : `Surah ${r.surah} · ${r.ayahFrom}–${r.ayahTo}`;
}

export default function Themes() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = "Themes — MindfulVerse";
    let alive = true;
    loadThemes()
      .then((rows) => {
        if (alive) setStatus({ kind: "ready", groups: groupByTheme(rows) });
      })
      .catch(() => {
        if (alive) setStatus({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const groups = status.kind === "ready" ? status.groups : [];

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.theme.toLowerCase().includes(q));
  }, [groups, filter]);

  if (status.kind === "loading") {
    return (
      <div className="container">
        <p className="muted">Gathering the themes…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>We couldn’t reach the themes</h2>
          <p className="muted">
            Something interrupted the connection. Take a breath, check your
            network, and try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  const shown = filtered.slice(0, visible);
  const filtering = filter.trim().length > 0;
  const count = filtered.length.toLocaleString("en-US");

  return (
    <div className="container stack">
      <header className="stack">
        <p className="label">Browse</p>
        <h1>Browse by theme</h1>
        <p className="soft">Curated passages, grouped by what they speak to.</p>
        <p className="muted" style={{ margin: 0 }}>
          {filtering
            ? `${count} ${filtered.length === 1 ? "theme matches" : "themes match"} your filter`
            : `${count} themes`}
        </p>
      </header>

      <input
        type="search"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setVisible(PAGE_SIZE);
        }}
        placeholder="Filter themes — e.g. patience, mercy"
        aria-label="Filter themes"
        style={{
          width: "100%",
          padding: "12px 14px",
          fontFamily: "var(--font-read)",
          fontSize: "1rem",
          color: "var(--ink)",
          background: "var(--cotton-raised)",
          border: "1px solid var(--line-strong)",
          borderRadius: 3,
        }}
      />

      {filtered.length === 0 ? (
        <p className="muted">
          Nothing here speaks to “{filter.trim()}” — try a broader word, like
          patience or mercy.
        </p>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {shown.map((g) => (
              <li
                key={g.theme}
                style={{
                  padding: "16px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontWeight: 500,
                    fontSize: "1.15rem",
                  }}
                >
                  {g.theme}
                </h2>
                <p
                  style={{
                    margin: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    columnGap: 18,
                    rowGap: 4,
                    fontSize: "0.92rem",
                  }}
                >
                  {g.ranges.map((r) => (
                    <Link key={r.id} to={`/read/${r.surah}?v=${r.ayahFrom}`}>
                      {rangeLabel(r)}
                    </Link>
                  ))}
                </p>
              </li>
            ))}
          </ul>

          {filtered.length > visible && (
            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
