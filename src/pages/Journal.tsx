import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAyahsByKeys, loadSessions, parseVerseKey } from "../lib/data";
import { getEntries, deleteEntry } from "../lib/journal";
import type { Ayah, JournalEntry } from "../lib/types";

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

/** The verse a check-in reflection was written about, shown with the entry. */
function EntryVerse({ verseKey }: { verseKey: string }) {
  const [ayah, setAyah] = useState<Ayah | null>(null);

  useEffect(() => {
    let alive = true;
    loadAyahsByKeys([verseKey])
      .then((a) => alive && setAyah(a[0] ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [verseKey]);

  if (!ayah) return null;
  const { surah, ayah: n } = parseVerseKey(verseKey);
  return (
    <Link
      to={`/read/${surah}?v=${n}`}
      style={{
        display: "block",
        color: "var(--ink)",
        borderInlineStart: "3px solid var(--indigo-wash)",
        paddingInlineStart: 14,
      }}
    >
      <span
        className="arabic"
        lang="ar"
        style={{ display: "block", fontSize: "1.35rem", lineHeight: 1.9 }}
      >
        {ayah.arabic}
      </span>
      <span className="soft" style={{ display: "block", fontSize: ".95rem", marginTop: 4 }}>
        {ayah.translation}
      </span>
      <span className="label" style={{ display: "block", marginTop: 4 }}>
        {verseKey}
      </span>
    </Link>
  );
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sessionTitles, setSessionTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setEntries(getEntries());
    loadSessions()
      .then((list) => setSessionTitles(new Map(list.map((s) => [s.id, s.title]))))
      .catch(() => {});
  }, []);

  function remove(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  function downloadJournal() {
    const text = entries
      .map((e) => {
        const where =
          e.context?.kind === "checkin" && e.context.ref
            ? `Verse ${e.context.ref}`
            : e.context?.kind === "session" && e.context.ref
              ? `Session: ${sessionTitles.get(e.context.ref) ?? e.context.ref}`
              : "";
        return [new Date(e.createdAt).toLocaleString(), where, e.prompt, e.body]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindfulverse-journal.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">Journal</div>
        <h1 style={{ margin: "6px 0" }}>Your reflections</h1>
        <p className="muted" style={{ marginTop: 0 }}>Saved on this device only.</p>
      </header>

      {entries.length > 0 && (
        <div className="stack" style={{ marginTop: 4 }}>
          {entries.length >= 3 && (
            <p className="soft" style={{ fontSize: ".92rem", margin: 0 }}>
              Your reflections live only on this device — if the browser’s data
              is ever cleared, they go with it. Download a copy now and then.
            </p>
          )}
          <button
            className="btn secondary"
            style={{ alignSelf: "flex-start" }}
            onClick={downloadJournal}
          >
            Download my journal
          </button>
        </div>
      )}

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

      {entries.map((e) => {
        const verseRef =
          e.context?.kind === "checkin" &&
          e.context.ref &&
          VERSE_KEY_RE.test(e.context.ref)
            ? e.context.ref
            : null;
        const sessionRef =
          e.context?.kind === "session" && e.context.ref ? e.context.ref : null;
        return (
          <div key={e.id} className="card stack">
            <div className="muted" style={{ fontSize: ".8rem" }}>
              {new Date(e.createdAt).toLocaleString()}
            </div>
            {verseRef && <EntryVerse verseKey={verseRef} />}
            {sessionRef && (
              <Link to={`/sessions/${sessionRef}`} className="label">
                From the session “{sessionTitles.get(sessionRef) ?? sessionRef}”
              </Link>
            )}
            <div style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>{e.prompt}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{e.body}</div>
            <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "4px 0" }} onClick={() => remove(e.id)}>
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
}
