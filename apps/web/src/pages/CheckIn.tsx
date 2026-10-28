import { track } from "@mindfulverse/core/analytics";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import {
  loadAyahsByKeys,
  loadEmotions,
  loadSurahs,
} from "@mindfulverse/core/data";
import { addEntry, checkedInToday } from "@mindfulverse/core/journal";
import { useAccount } from "@mindfulverse/core/sync/auth";
import type { Ayah, EmotionEntry } from "@mindfulverse/core/types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { DyeRule } from "../components/Adire";
import { shareVerse } from "../lib/share";

import "./checkin.css";

const VERSE_PROMPT = "What stays with you from this verse?";
// An unsaved reflection survives leaving the page (or the OS killing the PWA).
const DRAFT_KEY = "mindfulverse.checkinDraft.v1";

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(v: string): void {
  try {
    if (v) {
      localStorage.setItem(DRAFT_KEY, v);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    /* storage full or blocked — the draft is a convenience */
  }
}

// One tasteful motion: a short staggered reveal. Each item fades and rises in
// with a small per-index delay, capped so nothing waits long, and opacity only
// under prefers-reduced-motion. Kept under 240ms so each step feels immediate.
const STAGGER_MS = 40;
const MAX_STAGGER_MS = 120;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function revealStyle(
  index: number,
  mounted: boolean,
  reduced: boolean
): CSSProperties {
  const delay = Math.min(index * STAGGER_MS, MAX_STAGGER_MS);
  if (reduced) {
    return {
      opacity: mounted ? 1 : 0,
      transition: `opacity .22s var(--ease-out)`,
      transitionDelay: `${delay}ms`,
    };
  }
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(6px)",
    transition: `opacity .22s var(--ease-out), transform .22s var(--ease-out)`,
    transitionDelay: `${delay}ms`,
  };
}

// One thing at a time: the heart first, then the verse, then an optional
// reflection. Someone who already checked in today, or left words half
// written, opens straight on the verse (mobile: CheckIn/flow.ts).
type Stage = "feel" | "verse";

/** A verse as the check-in shows it. `onCloth` lays it on the dyed cloth (the
 *  verse of the day); the reference row can carry a trailing action. */
function AyahView({
  ayah,
  surahName,
  onCloth = false,
  trailing,
}: {
  ayah: Ayah;
  surahName?: string;
  onCloth?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className={`ci-ayah${onCloth ? " on-cloth" : ""}`}>
      <div className="arabic" lang="ar">
        {ayah.arabic}
      </div>
      <div className="translation">{ayah.translation}</div>
      <div className="ci-ref-row">
        <span className={onCloth ? "ci-ref cloth-soft" : "ci-ref muted"}>
          {surahName ? `${surahName} ` : ""}
          {ayah.verseKey}
        </span>
        {trailing}
      </div>
    </div>
  );
}

/** Verses shown for a feeling before "Show more". */
const FIRST_VERSES = 3;

export default function CheckIn() {
  // Shared with the Home hero — one verse of the day across the app.
  const [dailyKey, setDailyKey] = useState<string | null>(null);
  const { user, loading: accountLoading } = useAccount();
  const accountId = user?.id ?? null;
  useEffect(() => {
    // Each person has their own verse; wait for the account so it doesn't flip.
    if (accountLoading) {
      return;
    }
    let alive = true;
    const refresh = () => {
      todayVerseKey(accountId).then((k) => alive && setDailyKey(k));
    };
    refresh();
    // A tab left open past midnight should greet the new day's verse, not
    // tag a fresh reflection with yesterday's.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accountId, accountLoading]);

  useEffect(() => {
    document.title = "Daily check-in | MindfulVerse";
  }, []);

  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then(
        (list) =>
          alive && setSurahNames(new Map(list.map((x) => [x.number, x.name])))
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const reduced = useMemo(() => prefersReducedMotion(), []);

  // Verse of the day.
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [dailyError, setDailyError] = useState(false);
  const [dailyMounted, setDailyMounted] = useState(false);

  // Journal for the verse of the day. The draft is written on every change,
  // so nothing typed is lost to a reload or a closed tab.
  const [journalBody, setJournalBody] = useState(readDraft);
  const [doneToday] = useState(() => checkedInToday());
  const [saved, setSaved] = useState(() => doneToday && !readDraft().trim());
  const [stage, setStage] = useState<Stage>(() =>
    doneToday || readDraft().trim() ? "verse" : "feel"
  );
  const verseRef = useRef<HTMLElement>(null);

  // Sharing the verse of the day.
  const [shareResult, setShareResult] = useState<
    "shared" | "copied" | "failed" | null
  >(null);

  // Emotion picker.
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [emotionsError, setEmotionsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionAyahs, setEmotionAyahs] = useState<Ayah[]>([]);
  const [emotionAyahsError, setEmotionAyahsError] = useState(false);
  // Three verses keep the screen calm; the rest wait behind "Show more".
  const [showAllVerses, setShowAllVerses] = useState(false);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [emotionMounted, setEmotionMounted] = useState(false);
  // Only the latest emotion tap may fill the list — a slow earlier fetch must
  // not land under a newer framing.
  const emotionReq = useRef(0);

  useEffect(() => {
    track({ type: "checkin_view" });
  }, []);

  useEffect(() => {
    if (!dailyKey) {
      return;
    }
    let alive = true;
    setDailyError(false);
    loadAyahsByKeys([dailyKey])
      .then((ayahs) => {
        if (!alive) {
          return;
        }
        setDailyAyah(ayahs[0] ?? null);
        if (!ayahs[0]) {
          setDailyError(true);
        }
      })
      .catch(() => {
        if (alive) {
          setDailyError(true);
        }
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
    return;
  }, [dailyAyah]);

  useEffect(() => {
    let alive = true;
    loadEmotions()
      .then((list) => {
        if (alive) {
          setEmotions(list);
        }
      })
      .catch(() => {
        if (alive) {
          setEmotionsError(true);
        }
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
    return;
  }, [emotionAyahs]);

  const selected = useMemo(
    () => emotions.find((e) => e.id === selectedId) ?? null,
    [emotions, selectedId]
  );

  function selectEmotion(entry: EmotionEntry): void {
    setStage("verse");
    setSelectedId(entry.id);
    setEmotionAyahs([]);
    setEmotionAyahsError(false);
    setShowAllVerses(false);
    setEmotionLoading(true);
    setEmotionMounted(false);
    track({ emotion: entry.id, type: "checkin_view" });
    const req = ++emotionReq.current;
    loadAyahsByKeys(entry.verseKeys)
      .then((ayahs) => {
        if (req !== emotionReq.current) {
          return;
        }
        setEmotionAyahs(ayahs);
        setEmotionLoading(false);
      })
      .catch(() => {
        if (req !== emotionReq.current) {
          return;
        }
        setEmotionAyahsError(true);
        setEmotionLoading(false);
      });
  }

  // "Just show me today's verse": the skip link leaves the page, so carry
  // focus to the verse it opened.
  function skipToVerse(): void {
    setStage("verse");
    requestAnimationFrame(() => verseRef.current?.focus());
  }

  function saveJournal(): void {
    const body = journalBody.trim();
    if (!body) {
      return;
    }
    addEntry({
      prompt: VERSE_PROMPT,
      body,
      // ref carries the verse this reflection was written about, so the
      // journal can show the ayah alongside the entry.
      context: { kind: "checkin", ref: dailyAyah?.verseKey },
    });
    track({ context: "checkin", type: "journal_save" });
    setJournalBody("");
    writeDraft("");
    setSaved(true);
  }

  const atVerse = stage === "verse";
  const hasDraft = journalBody.trim().length > 0;

  return (
    <div className={`stack ci-page${atVerse ? " at-verse" : ""}`}>
      <header>
        {atVerse ? (
          <h1>A quiet moment</h1>
        ) : (
          <>
            <h1 id="ci-heart-title">How is your heart today?</h1>
            <p className="soft ci-lede">
              Tap a word if one fits. There&rsquo;s no wrong answer.
            </p>
          </>
        )}
      </header>

      {/* The heart: one tap, no typing, and optional. Once the verse is open
          the chips stay here, compact, so a feeling can always be changed.
          Kept in the app's quiet indigo voice. */}
      <section className="ci-feel" aria-labelledby="ci-heart-title">
        {atVerse && (
          <h2 className="ci-feel-label" id="ci-heart-title">
            How is your heart today?
          </h2>
        )}
        {emotionsError ? (
          <p className="muted">
            The reminders are still being gathered. Come back in a little while
            and they will be here.
          </p>
        ) : emotions.length === 0 ? (
          <p className="muted">Gathering a few words for you&hellip;</p>
        ) : (
          <div className="ci-chips">
            {emotions.map((entry) => {
              const isActive = entry.id === selectedId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="ci-chip"
                  aria-pressed={isActive}
                  onClick={() => selectEmotion(entry)}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        )}
        {!atVerse && (
          <button type="button" className="ci-skip" onClick={skipToVerse}>
            Just show me today&rsquo;s verse
          </button>
        )}
      </section>

      {atVerse && (
        <div className="ci-reveal">
          {/* Verse of the day: the anchor, laid on the dyed cloth. */}
          <section
            className="cloth ci-verse"
            aria-labelledby="ci-verse-title"
            ref={verseRef}
            tabIndex={-1}
          >
            <h2 className="sr-only" id="ci-verse-title">
              Verse of the day
            </h2>
            {dailyError ? (
              <p className="cloth-soft ci-note">
                Today&rsquo;s verse is still being gathered. Come back in a
                little while and it will be waiting for you.
              </p>
            ) : dailyAyah ? (
              <div style={revealStyle(0, dailyMounted, reduced)}>
                <AyahView
                  ayah={dailyAyah}
                  surahName={surahNames.get(dailyAyah.surah)}
                  onCloth
                  trailing={
                    <span className="ci-share">
                      {shareResult && (
                        <span
                          className="cloth-soft ci-share-status"
                          role="status"
                        >
                          {shareResult === "shared"
                            ? "Shared"
                            : shareResult === "copied"
                              ? "Copied to clipboard"
                              : "Couldn’t share"}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ci-share-btn"
                        onClick={() => {
                          void shareVerse(dailyAyah, "checkin").then(
                            (r: string) => {
                              // Closing the share sheet is not an outcome worth confirming.
                              if (r !== "cancelled") {
                                setShareResult(
                                  r as "shared" | "copied" | "failed"
                                );
                              }
                            }
                          );
                        }}
                      >
                        Share this verse
                      </button>
                    </span>
                  }
                />
              </div>
            ) : (
              <p className="cloth-soft ci-note">
                Bringing today&rsquo;s verse to you&hellip;
              </p>
            )}
          </section>

          {/* The feeling's verses: a gentle follow-on beneath the anchor. */}
          {selected && (
            <section
              className="ci-framed"
              aria-labelledby="ci-framing"
              key={selected.id}
            >
              <h2 className="ci-framing" id="ci-framing">
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
                <>
                  {emotionAyahs
                    .slice(0, showAllVerses ? undefined : FIRST_VERSES)
                    .map((ayah, i) => (
                      <div
                        key={ayah.verseKey}
                        className="card stack"
                        style={revealStyle(
                          i < FIRST_VERSES ? i : i - FIRST_VERSES,
                          emotionMounted,
                          reduced
                        )}
                      >
                        <AyahView
                          ayah={ayah}
                          surahName={surahNames.get(ayah.surah)}
                        />
                      </div>
                    ))}
                  {!showAllVerses && emotionAyahs.length > FIRST_VERSES ? (
                    <button
                      type="button"
                      className="ci-skip ci-more"
                      aria-expanded={false}
                      onClick={() => setShowAllVerses(true)}
                    >
                      Show {emotionAyahs.length - FIRST_VERSES} more{" "}
                      {emotionAyahs.length - FIRST_VERSES === 1
                        ? "verse"
                        : "verses"}
                    </button>
                  ) : null}
                </>
              )}
            </section>
          )}

          <DyeRule className="ci-rule" />

          {/* An optional reflection, last, on the open cotton. */}
          <section className="ci-section">
            <label htmlFor="checkin-journal" className="ci-heading">
              {VERSE_PROMPT}
            </label>
            <p className="muted ci-hint" id="checkin-journal-hint">
              Only if you&rsquo;d like. A line is plenty.
            </p>
            <textarea
              id="checkin-journal"
              aria-describedby="checkin-journal-hint"
              value={journalBody}
              onChange={(e) => {
                setJournalBody(e.target.value);
                writeDraft(e.target.value);
                if (saved) {
                  setSaved(false);
                }
              }}
              placeholder="Write as much or as little as you like…"
              rows={5}
              className="ci-textarea"
            />
            <div className="ci-actions">
              <button
                type="button"
                className="btn ci-save"
                onClick={saveJournal}
                disabled={!hasDraft}
              >
                Keep in journal
              </button>
              {hasDraft && <span className="muted ci-draft">Draft kept</span>}
              <span className="soft ci-kept" role="status">
                {saved && !hasDraft ? "Kept in your journal ✓" : ""}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
