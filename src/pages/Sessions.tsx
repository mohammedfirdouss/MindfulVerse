import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadSessions } from "../lib/data";
import type { TadabburSession } from "../lib/types";

type Status =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sessions: TadabburSession[] };

export default function Sessions() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    loadSessions()
      .then((sessions) => {
        if (alive) setStatus({ kind: "ready", sessions });
      })
      .catch(() => {
        if (alive) setStatus({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status.kind === "loading") {
    return (
      <div className="container">
        <p className="muted">Gathering the sessions…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>We couldn’t reach the sessions</h2>
          <p className="muted">
            Something interrupted the connection. Take a breath, check your
            network, and try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container stack">
      <header className="stack">
        <p className="label">Tadabbur</p>
        <h1>Sessions</h1>
        <p className="soft">
          Short, guided reflections through the Qur’an — one thought at a time.
        </p>
      </header>

      {status.sessions.length === 0 ? (
        <p className="muted">
          There are no sessions here yet. Please come back soon — more are on
          the way.
        </p>
      ) : (
        <ul
          className="stack"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {status.sessions.map((s) => (
            <li key={s.id}>
              <Link
                to={`/sessions/${s.id}`}
                style={{
                  display: "block",
                  color: "inherit",
                  padding: "18px 0",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <p className="label" style={{ margin: "0 0 4px" }}>
                  {s.theme}
                </p>
                <h2 style={{ margin: 0, fontWeight: 500 }}>{s.title}</h2>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {s.steps.length} {s.steps.length === 1 ? "step" : "steps"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
