import { useEffect, useState } from "react";
import { getEntries, deleteEntry } from "../lib/journal";
import type { JournalEntry } from "../lib/types";

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => setEntries(getEntries()), []);

  function remove(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">Journal</div>
        <h1 style={{ margin: "6px 0" }}>Your reflections</h1>
        <p className="muted" style={{ marginTop: 0 }}>Saved on this device only.</p>
      </header>

      {entries.length === 0 && (
        <div className="card muted">
          Nothing yet. Reflections you write in a check-in or tadabbur session appear here.
        </div>
      )}

      {entries.map((e) => (
        <div key={e.id} className="card stack">
          <div className="muted" style={{ fontSize: ".8rem" }}>
            {new Date(e.createdAt).toLocaleString()}
          </div>
          <div style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>{e.prompt}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{e.body}</div>
          <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "4px 0" }} onClick={() => remove(e.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
