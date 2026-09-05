// /stats — private, on-device dashboard for the v0 retention experiment.
// No backend: everything is derived from localStorage. The "Copy my stats"
// button lets testers paste their numbers into WhatsApp for the founder.
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getEvents } from "../lib/analytics";
import { currentStreak, totalVisitDays } from "../lib/progress";
import { getEntries } from "../lib/journal";

const FIRST_SEEN_KEY = "mindfulverse.firstSeen.v1";

interface StatsSnapshot {
  eventCount: number;
  daysVisited: number;
  streak: number;
  appOpenDays: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  completionPct: number | null;
  checkinViews: number;
  topEmotions: Array<[string, number]>;
  journalCount: number;
  payTaps: number;
  versesShared: number;
  dhikrCompleted: number;
  firstSeen: number | null;
  daysSinceFirstSeen: number | null;
}

function dayKey(t: number): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function readFirstSeen(): number | null {
  try {
    const raw = localStorage.getItem(FIRST_SEEN_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function computeStats(): StatsSnapshot {
  const events = getEvents();

  const openDays = new Set<string>();
  let sessionsStarted = 0;
  let sessionsCompleted = 0;
  let checkinViews = 0;
  let payTaps = 0;
  let versesShared = 0;
  let dhikrCompleted = 0;
  const emotions = new Map<string, number>();

  for (const { t, e } of events) {
    switch (e.type) {
      case "app_open":
        openDays.add(dayKey(t));
        break;
      case "session_start":
        sessionsStarted++;
        break;
      case "session_complete":
        sessionsCompleted++;
        break;
      case "checkin_view":
        checkinViews++;
        if (e.emotion) emotions.set(e.emotion, (emotions.get(e.emotion) ?? 0) + 1);
        break;
      case "intent_pay_tap":
        payTaps++;
        break;
      case "share_verse":
        versesShared++;
        break;
      case "dhikr_complete":
        dhikrCompleted++;
        break;
      case "journal_save":
        break;
    }
  }

  const topEmotions = [...emotions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const firstSeen = readFirstSeen();
  const daysSinceFirstSeen =
    firstSeen === null
      ? null
      : Math.max(0, Math.floor((Date.now() - firstSeen) / 86_400_000));

  return {
    eventCount: events.length,
    daysVisited: totalVisitDays(),
    streak: currentStreak(),
    appOpenDays: openDays.size,
    sessionsStarted,
    sessionsCompleted,
    completionPct:
      sessionsStarted > 0
        ? Math.round((sessionsCompleted / sessionsStarted) * 100)
        : null,
    checkinViews,
    topEmotions,
    journalCount: getEntries().length,
    payTaps,
    versesShared,
    dhikrCompleted,
    firstSeen,
    daysSinceFirstSeen,
  };
}

function summaryText(s: StatsSnapshot): string {
  const emotions =
    s.topEmotions.length > 0
      ? s.topEmotions.map(([name, n]) => `${name} ×${n}`).join(", ")
      : "none";
  const firstSeen =
    s.firstSeen !== null
      ? `${new Date(s.firstSeen).toLocaleDateString()} (${s.daysSinceFirstSeen}d ago)`
      : "unknown";
  return [
    "MindfulVerse — my stats",
    `First seen: ${firstSeen}`,
    `Days visited: ${s.daysVisited} (streak ${s.streak})`,
    `Days opened: ${s.appOpenDays}`,
    `Sessions: ${s.sessionsStarted} started, ${s.sessionsCompleted} completed${
      s.completionPct !== null ? ` (${s.completionPct}%)` : ""
    }`,
    `Check-ins: ${s.checkinViews} · emotions: ${emotions}`,
    `Journal entries: ${s.journalCount}`,
    `Pay-intent taps: ${s.payTaps}`,
    `Verses shared: ${s.versesShared}`,
    `Dhikr completed: ${s.dhikrCompleted}`,
  ].join("\n");
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div style={{ fontSize: "1.9rem", fontWeight: 600, color: "var(--indigo-deep)", lineHeight: 1.2 }}>
        {value}
      </div>
      {note && <div className="soft" style={{ fontSize: ".9rem", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

export default function Stats() {
  const stats = useMemo(computeStats, []);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  async function copyStats() {
    try {
      await navigator.clipboard.writeText(summaryText(stats));
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — leave the button as-is */
    }
  }

  const hasData = stats.eventCount > 0;

  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">Stats</div>
        <h1 style={{ margin: "6px 0" }}>Your numbers</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Private, on-device data. Nothing here leaves your phone unless you copy and send it.
        </p>
      </header>

      {!hasData ? (
        <div className="card stack">
          <p style={{ margin: 0, fontSize: "1.1rem" }}>Nothing to count yet.</p>
          <p className="soft" style={{ margin: 0 }}>
            Spend a little time with the app — a check-in, a session, a verse —
            and your numbers will gather here.
          </p>
          <Link to="/" className="btn" style={{ alignSelf: "flex-start", marginTop: 4 }}>
            Start today
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            <Metric
              label="Days visited"
              value={String(stats.daysVisited)}
              note={`current streak ${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
            />
            <Metric
              label="Days opened"
              value={String(stats.appOpenDays)}
              note="distinct days with an app open"
            />
            <Metric
              label="Sessions"
              value={`${stats.sessionsCompleted} / ${stats.sessionsStarted}`}
              note={
                stats.completionPct !== null
                  ? `${stats.completionPct}% of started sessions completed`
                  : "none started yet"
              }
            />
            <Metric
              label="Check-ins viewed"
              value={String(stats.checkinViews)}
              note={
                stats.topEmotions.length > 0
                  ? stats.topEmotions.map(([name, n]) => `${name} ×${n}`).join(" · ")
                  : "no emotions chosen yet"
              }
            />
            <Metric label="Journal entries" value={String(stats.journalCount)} />
            <Metric label="Pay-intent taps" value={String(stats.payTaps)} />
            <Metric label="Verses shared" value={String(stats.versesShared)} />
            <Metric label="Dhikr completed" value={String(stats.dhikrCompleted)} />
            <Metric
              label="First seen"
              value={
                stats.firstSeen !== null
                  ? new Date(stats.firstSeen).toLocaleDateString()
                  : "—"
              }
              note={
                stats.daysSinceFirstSeen !== null
                  ? `${stats.daysSinceFirstSeen} day${stats.daysSinceFirstSeen === 1 ? "" : "s"} ago`
                  : "not recorded yet"
              }
            />
          </div>

          <div className="card stack">
            <p className="soft" style={{ margin: 0 }}>
              Testing MindfulVerse? Copy your numbers and send them over WhatsApp.
            </p>
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={copyStats}>
              {copied ? "Copied" : "Copy my stats"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
