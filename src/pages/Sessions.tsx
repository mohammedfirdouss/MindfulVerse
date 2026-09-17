import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadSessions, loadSurahs } from "../lib/data";
import {
  getAllSessionProgress,
  getSurahTadabbur,
  latestSurahTadabbur,
} from "../lib/progress";
import type { SurahMeta, TadabburSession } from "../lib/types";

type SessionsStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sessions: TadabburSession[] };

const COLLAPSED_COUNT = 10;

/** The surah picker: search/filter + a compact hairline list of the 114. */
function SurahPicker({ surahs }: { surahs: SurahMeta[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.number) === q
    );
  }, [query, surahs]);

  const filtering = query.trim().length > 0;
  const visible =
    filtering || showAll ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="stack">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a surah by name or number"
        aria-label="Find a surah by name or number"
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          color: "var(--ink)",
          font: "inherit",
          fontSize: ".95rem",
        }}
      />
      {visible.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No surah matches that — try a different name or a number from 1 to
          114.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visible.map((s) => {
            const progress = getSurahTadabbur(s.number);
            return (
              <li key={s.number}>
                <Link
                  to={`/tadabbur/${s.number}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: "inherit",
                    padding: "10px 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <span className="roundel">{s.number}</span>
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  <span className="muted" style={{ marginLeft: "auto" }}>
                    {s.ayahCount} verses
                    {progress ? ` · verse ${progress.ayah}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {hiddenCount > 0 && (
        <div>
          <button className="btn ghost" onClick={() => setShowAll(true)}>
            Show all 114
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sessions() {
  const [status, setStatus] = useState<SessionsStatus>({ kind: "loading" });
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const progress = useMemo(() => getAllSessionProgress(), []);
  const latest = useMemo(() => latestSurahTadabbur(), []);

  useEffect(() => {
    let alive = true;
    loadSessions()
      .then((sessions) => {
        if (alive) setStatus({ kind: "ready", sessions });
      })
      .catch(() => {
        if (alive) setStatus({ kind: "error" });
      });
    loadSurahs()
      .then((list) => {
        if (alive) setSurahs(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const latestName =
    latest != null
      ? (surahs.find((s) => s.number === latest.surah)?.name ??
        `Surah ${latest.surah}`)
      : null;

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Tadabbur</p>
        <h1>Ponder the Qur’an</h1>
        <p className="soft">Slow down and sit with a few verses at a time.</p>
      </header>

      <section className="stack">
        <h2 style={{ margin: 0, fontWeight: 500 }}>By surah</h2>
        <p className="soft" style={{ margin: 0 }}>
          Learn its background, then move through it verse by verse.
        </p>

        {latest != null && (
          <Link to={`/tadabbur/${latest.surah}`} style={{ color: "inherit" }}>
            <div className="card">
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>
                Continue
              </p>
              <p style={{ margin: 0, fontWeight: 500 }}>
                {latestName} · verse {latest.ayah}
              </p>
            </div>
          </Link>
        )}

        {surahs.length > 0 ? (
          <SurahPicker surahs={surahs} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Gathering the surahs…
          </p>
        )}
      </section>

      <section className="stack">
        <h2 style={{ margin: 0, fontWeight: 500 }}>By theme</h2>
        <p className="soft" style={{ margin: 0 }}>
          Short guided reflections — a few verses gathered around one theme.
        </p>

        {status.kind === "loading" && (
          <p className="muted" style={{ margin: 0 }}>
            Gathering the sessions…
          </p>
        )}

        {status.kind === "error" && (
          <div className="card stack">
            <h3 style={{ margin: 0, fontWeight: 500 }}>
              We couldn’t reach the sessions
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              Something interrupted the connection. Take a breath, check your
              network, and try again in a moment.
            </p>
          </div>
        )}

        {status.kind === "ready" &&
          (status.sessions.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              There are no sessions here yet. Please come back soon — more are
              on the way.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                columnGap: 32,
              }}
            >
              {[...status.sessions]
                .map((s) => {
                  const p = progress[s.id];
                  const completed = p?.completedAt != null;
                  const inProgress = !completed && p != null && p.step >= 0;
                  return { s, completed, inProgress };
                })
                .sort(
                  (a, b) =>
                    Number(b.inProgress) - Number(a.inProgress) ||
                    Number(a.completed) - Number(b.completed)
                )
                .map(({ s, completed, inProgress }) => (
                  <li key={s.id}>
                    <Link
                      to={`/sessions/${s.id}`}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                        color: "inherit",
                        padding: "12px 0",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{s.theme}</span>
                      <span
                        className="muted"
                        style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                      >
                        {completed ? (
                          <span style={{ color: "var(--indigo)" }}>
                            <span aria-hidden="true">✦</span> Completed
                          </span>
                        ) : inProgress ? (
                          <span style={{ color: "var(--kola)" }}>Continue</span>
                        ) : (
                          `${s.steps.length} ${
                            s.steps.length === 1 ? "step" : "steps"
                          }`
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
