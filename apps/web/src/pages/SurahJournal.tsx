import { loadSurahAyahs, loadSurahs } from "@mindfulverse/core/data";
import { parseFollowUpBody } from "@mindfulverse/core/followUps";
import { getEntries } from "@mindfulverse/core/journal";
import { surahJournal } from "@mindfulverse/core/surahJournal";
import type { SurahJournalItem } from "@mindfulverse/core/surahJournal";
import { TADABBUR_LABELS } from "@mindfulverse/core/tadabburBody";
import type { TadabburParts } from "@mindfulverse/core/tadabburBody";
import type { Ayah } from "@mindfulverse/core/types";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buildJournalText, formatDate, saveFile } from "../lib/journalExport";
import { surahJournalSections } from "../lib/surahJournalExport";

import "./surah-journal.css";

const MAX_SURAH = 114;
const PART_KEYS = ["lessons", "reflection", "action", "connections"] as const;
const NON_ALNUM = /[^a-z0-9]+/gu;
const EDGE_DASHES = /^-+|-+$/gu;

function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(NON_ALNUM, "-")
    .replaceAll(EDGE_DASHES, "");
}

function Parts({ parts }: { parts: TadabburParts }) {
  return (
    <>
      {PART_KEYS.map((key) =>
        parts[key] ? (
          <p key={key} className="sj-part">
            <span className="sj-label">{TADABBUR_LABELS[key]}</span>
            {parts[key]}
          </p>
        ) : null
      )}
    </>
  );
}

function Item({ item }: { item: SurahJournalItem }) {
  const followUp = item.followUp ? parseFollowUpBody(item.followUp.body) : null;
  return (
    <div className="sj-item">
      <p className="soft sj-date">{formatDate(item.entry.createdAt)}</p>
      {item.parts ? (
        <Parts parts={item.parts} />
      ) : (
        <p className="sj-part">{item.entry.body}</p>
      )}
      {followUp?.answer && (
        <p className="soft sj-part">
          {`A week on: ${followUp.answer}${followUp.note ? ` — ${followUp.note}` : ""}`}
        </p>
      )}
    </div>
  );
}

function SurahJournalPage() {
  const { surah } = useParams<{ surah: string }>();
  const surahNumber = Number(surah);
  const valid =
    Number.isInteger(surahNumber) &&
    surahNumber >= 1 &&
    surahNumber <= MAX_SURAH;

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahName, setSurahName] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "txt" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const page = useMemo(
    () => (valid ? surahJournal(getEntries(), surahNumber) : null),
    [valid, surahNumber]
  );

  useEffect(() => {
    if (!valid) {
      return;
    }
    let active = true;
    setAyahs([]);
    setSurahName(null);
    loadSurahs()
      .then((list) => {
        if (active) {
          setSurahName(
            list.find((s) => s.number === surahNumber)?.name ??
              `Surah ${surahNumber}`
          );
        }
      })
      .catch(() => {
        if (active) {
          setSurahName(`Surah ${surahNumber}`);
        }
      });
    loadSurahAyahs(surahNumber)
      .then((data) => {
        if (active) {
          setAyahs(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [valid, surahNumber]);

  const name = surahName ?? `Surah ${surahNumber}`;

  useEffect(() => {
    document.title = valid
      ? `${name} · Your journal | MindfulVerse`
      : "Journal | MindfulVerse";
  }, [valid, name]);

  if (!valid || !page) {
    return (
      <div className="card stack">
        <h2>That surah isn’t here</h2>
        <p className="muted">
          Surahs run from 1 to 114. We couldn’t find the one this link points
          to.
        </p>
        <div>
          <Link to="/journal" className="btn secondary">
            Back to your reflections
          </Link>
        </div>
      </div>
    );
  }

  const byKey = new Map(ayahs.map((a) => [a.verseKey, a]));

  async function download(kind: "pdf" | "txt") {
    if (exporting || !page) {
      return;
    }
    setExporting(kind);
    setExportError(null);
    try {
      const sections = surahJournalSections(page, name, byKey);
      const input = {
        exportedAt: new Date(),
        sections,
        title: `${name} — my tadabbur`,
      };
      const base = `mindfulverse-${slugOf(name)}`;
      if (kind === "pdf") {
        const { buildJournalPdf } = await import("../lib/journalPdf");
        const bytes = await buildJournalPdf(input);
        await saveFile(bytes as BlobPart, `${base}.pdf`, "application/pdf");
      } else {
        await saveFile(buildJournalText(input), `${base}.txt`, "text/plain");
      }
    } catch {
      setExportError(
        kind === "pdf"
          ? "Couldn’t make the PDF. Check your connection and try again, or use plain text."
          : "Couldn’t save the file. Please try again."
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="stack">
      <Link to="/journal" className="muted back-link">
        Your reflections
      </Link>
      <header>
        <p className="eyebrow">{name}</p>
        <h1>{`Your journal on ${name}`}</h1>
      </header>

      {page.isEmpty ? (
        <div className="card stack">
          <p className="soft">{`Nothing written on ${name} yet.`}</p>
          <div>
            <Link to={`/tadabbur/${surahNumber}`} className="btn">
              Begin pondering
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="sj-actions">
            <button
              type="button"
              className="btn"
              onClick={() => download("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Making your PDF…" : "Save as PDF"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => download("txt")}
              disabled={exporting !== null}
            >
              Plain text
            </button>
          </div>
          {exportError && <p className="form-error">{exportError}</p>}

          {page.intention && (
            <section className="card stack" aria-label="My intention">
              <p className="eyebrow" style={{ margin: 0 }}>
                My intention
              </p>
              <blockquote className="sj-quote">
                {page.intention.body}
              </blockquote>
            </section>
          )}

          {page.verses.map((v) => {
            const ayah = byKey.get(v.verseKey);
            return (
              <section
                key={v.verseKey}
                className="card stack"
                aria-label={`Verse ${v.verseKey}`}
              >
                <p className="eyebrow" style={{ margin: 0 }}>
                  {v.verseKey}
                </p>
                {ayah && <p className="translation">{ayah.translation}</p>}
                {v.items.map((item) => (
                  <Item key={item.entry.id} item={item} />
                ))}
              </section>
            );
          })}

          {page.also.length > 0 && (
            <section
              className="card stack"
              aria-label={`Also written on ${name}`}
            >
              <h2
                style={{ fontSize: "1.15rem" }}
              >{`Also written on ${name}`}</h2>
              {page.also.map((e) => (
                <div key={e.id} className="sj-item">
                  <p className="soft sj-date">
                    {`${e.context?.ref ?? ""} · ${formatDate(e.createdAt)}`}
                  </p>
                  <p className="sj-part">{e.body}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default SurahJournalPage;
