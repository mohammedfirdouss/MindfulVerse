import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadAyahsByKeys, loadSessions, loadSurahs, parseVerseKey } from "../lib/data";
import { getEntries, deleteEntry } from "../lib/journal";
import { groupEntries, type JournalGroup } from "../lib/journalGroups";
import {
  buildJournalText,
  formatDate,
  saveFile,
  toSections,
  type ExportInput,
} from "../lib/journalExport";
import { useAccount } from "../lib/sync/auth";
import { getSyncStatus, onSyncStatus, statusLabel, type SyncStatus } from "../lib/sync/engine";
import type { Ayah, JournalEntry } from "../lib/types";

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;

/** Empty state: quiet and minimal — one line of intent, one way to begin. */
function EmptyJournal() {
  return (
    <div className="empty-quiet">
      <p style={{ fontWeight: 600 }}>Nothing here yet, and that’s fine.</p>
      <p className="soft">When a verse stops you, write what it said to you.</p>
      <Link to="/checkin" className="btn" style={{ marginTop: 14 }}>
        Begin with today’s verse
      </Link>
    </div>
  );
}

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
      <span className="eyebrow" style={{ display: "block", marginTop: 4 }}>
        {verseKey}
      </span>
    </Link>
  );
}

function EntryCard({
  entry,
  sessionTitles,
  onDelete,
}: {
  entry: JournalEntry;
  sessionTitles: Map<string, string>;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const verseRef =
    (entry.context?.kind === "checkin" || entry.context?.kind === "tadabbur") &&
    entry.context.ref &&
    VERSE_KEY_RE.test(entry.context.ref)
      ? entry.context.ref
      : null;
  const sessionRef =
    entry.context?.kind === "session" && entry.context.ref ? entry.context.ref : null;
  return (
    <div className="card stack">
      <div className="muted" style={{ fontSize: ".8rem" }}>
        {formatDate(entry.createdAt)}
      </div>
      {verseRef && <EntryVerse verseKey={verseRef} />}
      {sessionRef && (
        <Link to={`/sessions/${sessionRef}`} className="eyebrow">
          From the session “{sessionTitles.get(sessionRef) ?? sessionRef}”
        </Link>
      )}
      <div style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>{entry.prompt}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{entry.body}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "baseline",
          gap: 14,
        }}
      >
        {confirming ? (
          <>
            <span className="soft" style={{ fontSize: ".85rem" }}>
              Delete this reflection?
            </span>
            <button className="delete-quiet" onClick={() => onDelete(entry.id)}>
              Yes, delete
            </button>
            <button
              className="link-btn"
              style={{ fontSize: ".85rem" }}
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </>
        ) : (
          <button className="delete-quiet" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function groupTitle(
  g: JournalGroup,
  surahNames: Map<number, string>,
  sessionTitles: Map<string, string>
): string {
  if (g.surah) return surahNames.get(g.surah) ?? `Surah ${g.surah}`;
  if (g.sessionId) return sessionTitles.get(g.sessionId) ?? g.sessionId;
  return "Other reflections";
}

export default function Journal() {
  const { user, loading } = useAccount();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [sessionTitles, setSessionTitles] = useState<Map<string, string>>(new Map());
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => {
    setEntries(getEntries());
    loadSessions()
      .then((list) => setSessionTitles(new Map(list.map((s) => [s.id, s.title]))))
      .catch(() => {});
    loadSurahs()
      .then((list) => setSurahNames(new Map(list.map((s) => [s.number, s.name]))))
      .catch(() => {});
  }, []);

  // A sync can pull entries from the account after this page mounted (a new
  // device, a cold open straight to /journal) — show them when it lands.
  useEffect(
    () =>
      onSyncStatus((s) => {
        setStatus(s);
        if (s === "synced") setEntries(getEntries());
      }),
    []
  );

  const [exporting, setExporting] = useState<"pdf" | "txt" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const groups = groupEntries(entries);

  function remove(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  async function exportInput(): Promise<ExportInput> {
    const keys = [
      ...new Set(
        entries
          .map((e) => e.context?.ref)
          .filter((r): r is string => !!r && VERSE_KEY_RE.test(r))
      ),
    ];
    const ayahs = await loadAyahsByKeys(keys).catch(() => [] as Ayah[]);
    const verses = new Map(ayahs.map((a) => [a.verseKey, a]));
    return {
      sections: toSections(
        groups,
        (g) => groupTitle(g, surahNames, sessionTitles),
        surahNames,
        verses
      ),
      exportedAt: new Date(),
    };
  }

  async function download(kind: "pdf" | "txt") {
    if (exporting) return;
    setExporting(kind);
    setExportError(null);
    try {
      const input = await exportInput();
      if (kind === "pdf") {
        const { buildJournalPdf } = await import("../lib/journalPdf");
        const bytes = await buildJournalPdf(input);
        await saveFile(bytes as BlobPart, "mindfulverse-journal.pdf", "application/pdf");
      } else {
        await saveFile(buildJournalText(input), "mindfulverse-journal.txt", "text/plain");
      }
    } catch {
      setExportError(
        kind === "pdf"
          ? "Couldn’t make the PDF — check your connection and try again, or use plain text."
          : "Couldn’t save the file — please try again."
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Journal</p>
        <h1>Your reflections</h1>
        {user && (
          <p className="muted" style={{ marginTop: 0 }}>Backed up to your account.</p>
        )}
      </header>

      {entries.length > 0 && (
        <div className="stack" style={{ marginTop: 4 }}>
          {/* Signed in, the line only exists to carry the sync status — skip
              it entirely when there is no wording for the current status. */}
          {!loading && (entries.length >= 3 || user) && (!user || statusLabel(status) !== "") && (
            <p className="soft" style={{ fontSize: ".92rem", margin: 0 }}>
              {user ? (
                statusLabel(status)
              ) : (
                <>
                  Entries live only on this device. <Link to="/account">Sign in</Link> to
                  back them up.
                </>
              )}
            </p>
          )}
          <div className="journal-export">
            <button
              className="btn secondary"
              onClick={() => void download("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Preparing your PDF…" : "Download as PDF"}
            </button>
            <button
              className="link-btn"
              onClick={() => void download("txt")}
              disabled={exporting !== null}
            >
              or plain text
            </button>
          </div>
          {exportError && <p className="form-error">{exportError}</p>}
        </div>
      )}

      {entries.length === 0 && <EmptyJournal />}

      {groups.map((g) => (
        <section key={g.key} className="stack" aria-label={groupTitle(g, surahNames, sessionTitles)}>
          <header style={{ borderBottom: "2px solid var(--indigo-wash)", paddingBottom: 8 }}>
            <h2 style={{ fontSize: "1.15rem" }}>
              {groupTitle(g, surahNames, sessionTitles)}
            </h2>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: ".85rem" }}>
              {g.entries.length === 1 ? "1 reflection" : `${g.entries.length} reflections`}
              {g.surah && (
                <>
                  {" · "}
                  <Link to={`/tadabbur/${g.surah}`}>Continue this surah’s tadabbur</Link>
                </>
              )}
            </p>
          </header>
          {g.entries.map((e) => (
            <EntryCard key={e.id} entry={e} sessionTitles={sessionTitles} onDelete={remove} />
          ))}
        </section>
      ))}
    </div>
  );
}
