import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Ayah, EmotionEntry } from "../lib/types";
import { loadAyahsByKeys, loadEmotions } from "../lib/data";
import { addEntry } from "../lib/journal";
import { todayVerseKey } from "../lib/dailyVerse";
import { shareVerse } from "../lib/share";
import { track } from "../lib/analytics";

const VERSE_PROMPT = "What does this verse stir in you today?";

// One tasteful motion: a staggered reveal. Each item fades and rises in with a
// small per-index delay. We cap the stagger so a long list never blocks reading
// or interaction, and we honour prefers-reduced-motion (opacity only, no rise).
const STAGGER_MS = 40;
const MAX_STAGGER_MS = 240;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function revealStyle(index: number, mounted: boolean, reduced: boolean): CSSProperties {
  const delay = Math.min(index * STAGGER_MS, MAX_STAGGER_MS);
  if (reduced) {
    return {
      opacity: mounted ? 1 : 0,
      transition: `opacity .32s var(--ease-out)`,
      transitionDelay: `${delay}ms`,
    };
  }
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(6px)",
    transition: `opacity .32s var(--ease-out), transform .32s var(--ease-out)`,
    transitionDelay: `${delay}ms`,
  };
}

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
  // Shared with the Home hero — one verse of the day across the app.
  const dailyKey = useMemo(() => todayVerseKey(), []);

  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Verse of the day.
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [dailyError, setDailyError] = useState(false);
  const [dailyMounted, setDailyMounted] = useState(false);

  // Journal for the verse of the day.
  const [journalBody, setJournalBody] = useState("");
  const [saved, setSaved] = useState(false);

  // Sharing the verse of the day.
  const [shareResult, setShareResult] = useState<"shared" | "copied" | "failed" | null>(null);

  // Emotion picker.
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [emotionsError, setEmotionsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionAyahs, setEmotionAyahs] = useState<Ayah[]>([]);
  const [emotionAyahsError, setEmotionAyahsError] = useState(false);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [emotionMounted, setEmotionMounted] = useState(false);

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

  // Reveal the verse of the day once it has arrived.
  useEffect(() => {
    if (dailyAyah) {
      const id = requestAnimationFrame(() => setDailyMounted(true));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [dailyAyah]);

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

  // Reveal the emotion verses each time a fresh set finishes loading.
  useEffect(() => {
    if (emotionAyahs.length > 0) {
      const id = requestAnimationFrame(() => setEmotionMounted(true));
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [emotionAyahs]);

  const selected = useMemo(
    () => emotions.find((e) => e.id === selectedId) ?? null,
    [emotions, selectedId]
  );

  function selectEmotion(entry: EmotionEntry): void {
    setSelectedId(entry.id);
    setEmotionAyahs([]);
    setEmotionAyahsError(false);
    setEmotionLoading(true);
    setEmotionMounted(false);
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
      // ref carries the verse this reflection was written about, so the
      // journal can show the ayah alongside the entry.
      context: { kind: "checkin", ref: dailyAyah?.verseKey },
    });
    track({ type: "journal_save", context: "checkin" });
    setJournalBody("");
    setSaved(true);
  }

  return (
    <div className="container stack">
      <header className="stack">
        <div className="label">Daily check-in</div>
        <h1>A quiet moment</h1>
      </header>

      {/* Verse of the day */}
      <section className="card stack">
        <div className="label">Verse of the day</div>
        {dailyError ? (
          <p className="muted">
            Today&rsquo;s verse is still being gathered. Come back in a little
            while and it will be waiting for you.
          </p>
        ) : dailyAyah ? (
          <div className="stack" style={revealStyle(0, dailyMounted, reduced)}>
            <AyahView ayah={dailyAyah} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  void shareVerse(dailyAyah, "checkin").then(setShareResult);
                }}
              >
                Share this verse
              </button>
              {shareResult && (
                <span className="muted" role="status">
                  {shareResult === "shared"
                    ? "Shared"
                    : shareResult === "copied"
                      ? "Copied to clipboard"
                      : "Couldn’t share"}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="muted">Bringing today&rsquo;s verse to you&hellip;</p>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                Kept in your journal. A new verse arrives tomorrow.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Emotion picker — kept in the app's quiet indigo voice; kola stays
          reserved for small accents, never a whole section. */}
      <section className="card stack">
        <div className="label">How is your heart today?</div>

        {emotionsError ? (
          <p className="muted">
            The reminders are still being gathered. Come back in a little while
            and they will be here.
          </p>
        ) : emotions.length === 0 ? (
          <p className="muted">Gathering a few words for you&hellip;</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
                These verses are still being gathered. Come back in a little
                while and they will be here for you.
              </p>
            ) : emotionLoading ? (
              <p className="muted">Gathering a few verses&hellip;</p>
            ) : (
              emotionAyahs.map((ayah, i) => (
                <div
                  key={ayah.verseKey}
                  className="card stack"
                  style={revealStyle(i, emotionMounted, reduced)}
                >
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
