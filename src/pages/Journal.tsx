import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
        <div className="card stack" style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: "1.1rem" }}>Your journal is empty — for now.</p>
          <p className="soft" style={{ margin: 0 }}>
            When a verse gives you something to sit with, write it down. Your reflections
            gather here, a quiet record of your journey through the Qur’an.
          </p>
          <Link to="/checkin" className="btn" style={{ alignSelf: "flex-start", marginTop: 4 }}>
            Begin with today’s verse
          </Link>
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
