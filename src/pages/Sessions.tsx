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
        <p className="muted">Loading sessions…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="container">
        <div className="card stack">
          <h2>Couldn’t load sessions</h2>
          <p className="muted">
            Something went wrong reaching your sessions. Please check your
            connection and try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container stack">
      <header className="stack">
        <p className="eyebrow">Tadabbur</p>
        <h1>Sessions</h1>
        <p className="muted">
          Short, guided reflections through the Qur’an — one thought at a time.
        </p>
      </header>

      {status.sessions.length === 0 ? (
        <p className="muted">No sessions available yet.</p>
      ) : (
        <div className="stack">
          {status.sessions.map((s) => (
            <Link
              key={s.id}
              to={`/sessions/${s.id}`}
              className="card stack"
              style={{ display: "block", color: "inherit" }}
            >
              <p className="eyebrow">{s.theme}</p>
              <h2 style={{ margin: 0 }}>{s.title}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {s.steps.length} {s.steps.length === 1 ? "step" : "steps"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
