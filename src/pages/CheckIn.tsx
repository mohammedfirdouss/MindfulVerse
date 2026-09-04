import { useEffect, useMemo, useState } from "react";
import type { Ayah, EmotionEntry } from "../lib/types";
import { loadAyahsByKeys, loadEmotions } from "../lib/data";
import { addEntry } from "../lib/journal";
import { track } from "../lib/analytics";

// A small, hand-vetted set of self-evidently comforting verses. We pick one
// per day deterministically so it is stable across reloads but rotates daily.
const DAILY_VERSES: string[] = [
  "94:5",
  "94:6",
  "2:286",
  "13:28",
  "2:152",
  "3:139",
  "65:3",
  "39:53",
  "2:155",
  "3:200",
  "65:2",
  "40:60",
  "2:45",
  "8:46",
  "12:87",
  "93:5",
  "93:7",
];

const VERSE_PROMPT = "What does this verse stir in you today?";

function AyahView({ ayah }: { ayah: Ayah }) {
  return (
    <div className="stack">
      <div className="arabic">{ayah.arabic}</div>
      <div className="translation">{ayah.translation}</div>
      <div className="muted" style={{ fontSize: ".8rem" }}>
        {ayah.verseKey}
      </div>
    </div>
  );
}

export default function CheckIn() {
  const dailyKey = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return DAILY_VERSES[dayIndex % DAILY_VERSES.length];
  }, []);

  // Verse of the day.
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [dailyError, setDailyError] = useState(false);

  // Journal for the verse of the day.
  const [journalBody, setJournalBody] = useState("");
  const [saved, setSaved] = useState(false);

  // Emotion picker.
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [emotionsError, setEmotionsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionAyahs, setEmotionAyahs] = useState<Ayah[]>([]);
  const [emotionAyahsError, setEmotionAyahsError] = useState(false);
  const [emotionLoading, setEmotionLoading] = useState(false);

  useEffect(() => {
    track({ type: "checkin_view" });
  }, []);

  useEffect(() => {
    let alive = true;
    loadAyahsByKeys([dailyKey])
      .then((ayahs) => {
        if (!alive) return;
        setDailyAyah(ayahs[0] ?? null);
        if (!ayahs[0]) setDailyError(true);
      })
      .catch(() => {
        if (alive) setDailyError(true);
      });
    return () => {
      alive = false;
    };
  }, [dailyKey]);

  useEffect(() => {
    let alive = true;
    loadEmotions()
      .then((list) => {
        if (alive) setEmotions(list);
      })
      .catch(() => {
        if (alive) setEmotionsError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => emotions.find((e) => e.id === selectedId) ?? null,
    [emotions, selectedId]
  );

  function selectEmotion(entry: EmotionEntry): void {
    setSelectedId(entry.id);
    setEmotionAyahs([]);
    setEmotionAyahsError(false);
    setEmotionLoading(true);
    track({ type: "checkin_view", emotion: entry.id });
    loadAyahsByKeys(entry.verseKeys)
      .then((ayahs) => {
        setEmotionAyahs(ayahs);
        setEmotionLoading(false);
      })
      .catch(() => {
        setEmotionAyahsError(true);
        setEmotionLoading(false);
      });
  }

  function saveJournal(): void {
    const body = journalBody.trim();
    if (!body) return;
    addEntry({
      prompt: VERSE_PROMPT,
      body,
      context: { kind: "checkin" },
    });
    track({ type: "journal_save", context: "checkin" });
    setJournalBody("");
    setSaved(true);
  }

  return (
    <div className="container stack">
      <header className="stack">
        <div className="eyebrow">Daily check-in</div>
        <h1>A quiet moment</h1>
      </header>

      {/* Verse of the day */}
      <section className="card stack">
        <div className="eyebrow">Verse of the day</div>
        {dailyError ? (
          <p className="muted">
            Today&rsquo;s verse is being prepared. Please check back soon.
          </p>
        ) : dailyAyah ? (
          <AyahView ayah={dailyAyah} />
        ) : (
          <p className="muted">Loading today&rsquo;s verse&hellip;</p>
        )}

        <div className="stack" style={{ marginTop: 4 }}>
          <label htmlFor="checkin-journal" style={{ fontWeight: 600 }}>
            {VERSE_PROMPT}
          </label>
          <textarea
            id="checkin-journal"
            value={journalBody}
            onChange={(e) => {
              setJournalBody(e.target.value);
              if (saved) setSaved(false);
            }}
            placeholder="Write as much or as little as you like&hellip;"
            rows={5}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: "var(--radius)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              font: "inherit",
              resize: "vertical",
            }}
          />
          <div
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <button
              type="button"
              className="btn"
              onClick={saveJournal}
              disabled={!journalBody.trim()}
              style={{ opacity: journalBody.trim() ? 1 : 0.5 }}
            >
              Save
            </button>
            {saved && (
              <span className="muted" role="status">
                Saved to your journal.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Emotion picker */}
      <section className="card stack">
        <div className="eyebrow">How is your heart today?</div>

        {emotionsError ? (
          <p className="muted">
            These reminders are being prepared. Please check back soon.
          </p>
        ) : emotions.length === 0 ? (
          <p className="muted">Loading&hellip;</p>
        ) : (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
          >
            {emotions.map((entry) => {
              const isActive = entry.id === selectedId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={isActive ? "btn" : "btn secondary"}
                  aria-pressed={isActive}
                  onClick={() => selectEmotion(entry)}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="stack" style={{ marginTop: 6 }}>
            <h2 style={{ fontSize: "1.1rem", color: "var(--ink)" }}>
              {selected.framing}
            </h2>
            {emotionAyahsError ? (
              <p className="muted">
                These verses are being prepared. Please check back soon.
              </p>
            ) : emotionLoading ? (
              <p className="muted">Gathering verses&hellip;</p>
            ) : (
              emotionAyahs.map((ayah) => (
                <div key={ayah.verseKey} className="card stack">
                  <AyahView ayah={ayah} />
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
