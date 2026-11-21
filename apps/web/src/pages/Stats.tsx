import { getEvents } from "@mindfulverse/core/analytics";
import type { FollowUpAnswer } from "@mindfulverse/core/followUps";
import { getEntries } from "@mindfulverse/core/journal";
import { currentStreak, totalVisitDays } from "@mindfulverse/core/progress";
import { getReadView } from "@mindfulverse/core/readingPrefs";
import { useAccount } from "@mindfulverse/core/sync/auth";
import {
  getSyncStatus,
  onSyncStatus,
  statusLabel,
} from "@mindfulverse/core/sync/engine";
import type { SyncStatus } from "@mindfulverse/core/sync/engine";
// /stats: private, on-device numbers for the v0 retention experiment.
// No backend: everything is derived from localStorage. The "Copy my stats"
// button lets testers email their numbers to the founder.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "./journal-empty.css";
import "./stats.css";
import { tallyCheckins } from "./stats-view";

const FIRST_SEEN_KEY = "mindfulverse.firstSeen.v1";

interface StatsSnapshot {
  eventCount: number;
  daysVisited: number;
  streak: number;
  appOpenDays: number;
  sessionsStarted: number;
  surahTadabburStarted: number;
  sessionsCompleted: number;
  completionPct: number | null;
  checkinViews: number;
  topEmotions: [string, number][];
  journalCount: number;
  versesShared: number;
  dhikrCompleted: number;
  readViewSwitches: number;
  followUpsShown: number;
  followUpsAnswered: number;
  followUpBreakdown: Record<FollowUpAnswer, number>;
  readView: string;
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
    if (!raw) {
      return null;
    }
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
  let surahTadabburStarted = 0;
  let sessionsCompleted = 0;
  let versesShared = 0;
  let dhikrCompleted = 0;
  let readViewSwitches = 0;
  // Home remounts per visit; count each verse once per local day.
  const followUpsSeen = new Set<string>();
  let followUpsAnswered = 0;
  const followUpBreakdown: Record<FollowUpAnswer, number> = {
    "Not yet": 0,
    Partly: 0,
    Yes: 0,
  };
  const { checkins: checkinViews, emotions } = tallyCheckins(
    events.map(({ e }) => e)
  );

  for (const { t, e } of events) {
    switch (e.type) {
      case "app_open": {
        openDays.add(dayKey(t));
        break;
      }
      case "session_start": {
        if (e.sessionId.startsWith("surah-")) {
          surahTadabburStarted++;
        } else {
          sessionsStarted++;
        }
        break;
      }
      case "session_complete": {
        sessionsCompleted++;
        break;
      }
      case "share_verse": {
        versesShared++;
        break;
      }
      case "dhikr_complete": {
        dhikrCompleted++;
        break;
      }
      case "read_view": {
        readViewSwitches++;
        break;
      }
      case "followup_shown": {
        followUpsSeen.add(`${e.verseKey}|${new Date(t).toDateString()}`);
        break;
      }
      case "followup_answered": {
        followUpsAnswered++;
        followUpBreakdown[e.answer]++;
        break;
      }
      case "journal_save": {
        break;
      }
      default: {
        break;
      }
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
    surahTadabburStarted,
    sessionsCompleted,
    completionPct:
      sessionsStarted > 0
        ? Math.round((sessionsCompleted / sessionsStarted) * 100)
        : null,
    checkinViews,
    topEmotions,
    journalCount: getEntries().length,
    versesShared,
    dhikrCompleted,
    readViewSwitches,
    followUpsShown: followUpsSeen.size,
    followUpsAnswered,
    followUpBreakdown,
    // The settled preference matters more than switch counts: this is the
    // persisted reader setting, defaulting to "with translation".
    readView: getReadView() === "reading" ? "Reading" : "Translation",
    firstSeen,
    daysSinceFirstSeen,
  };
}

function followUpNote(s: StatsSnapshot): string {
  const b = s.followUpBreakdown;
  return `Yes ${b.Yes}, Partly ${b.Partly}, Not yet ${b["Not yet"]}`;
}

function summaryText(s: StatsSnapshot): string {
  const emotions =
    s.topEmotions.length > 0
      ? s.topEmotions.map(([name, n]) => `${name} ×${n}`).join(", ")
      : "none";
  const firstSeen =
    s.firstSeen === null
      ? "unknown"
      : `${new Date(s.firstSeen).toLocaleDateString()} (${s.daysSinceFirstSeen}d ago)`;
  return [
    "MindfulVerse. My stats",
    `First seen: ${firstSeen}`,
    `Days visited: ${s.daysVisited} (streak ${s.streak})`,
    `Days opened: ${s.appOpenDays}`,
    `Sessions: ${s.sessionsStarted} started, ${s.sessionsCompleted} completed${
      s.completionPct === null ? "" : ` (${s.completionPct}%)`
    }`,
    `Check-ins: ${s.checkinViews}, emotions: ${emotions}`,
    `Journal entries: ${s.journalCount}`,
    `Verses shared: ${s.versesShared}`,
    `Dhikr completed: ${s.dhikrCompleted}`,
    `Follow-ups: ${s.followUpsAnswered} of ${s.followUpsShown} answered (${followUpNote(s)})`,
    `Surah tadabbur begun: ${s.surahTadabburStarted}`,
    `Reading view: ${s.readView} (${s.readViewSwitches} switches)`,
  ].join("\n");
}

function AccountLine() {
  const { user, loading } = useAccount();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => onSyncStatus(setStatus), []);

  if (loading) {
    return null;
  }
  if (!user) {
    return (
      <p className="soft stats-account">
        Not signed in. <Link to="/account">Sign in to back up</Link>
      </p>
    );
  }
  const label = statusLabel(status);
  return (
    <p className="soft stats-account">
      {user.email}
      {label !== "" && (
        <>
          <br />
          {label}
        </>
      )}
    </p>
  );
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** The rows shown, in order. Everything else stays in the copied summary. */
function rows(s: StatsSnapshot): [string, string][] {
  const list: [string, string][] = [
    ["Days in a row", plural(s.streak, "day", "days")],
    ["Days opened", String(s.appOpenDays)],
    ["Journal entries", String(s.journalCount)],
    ["Surahs begun", String(s.surahTadabburStarted)],
  ];
  // "0 of 0" says nothing, so these wait until there is something to count.
  if (s.sessionsStarted > 0) {
    list.push([
      "Sessions completed",
      `${s.sessionsCompleted} of ${s.sessionsStarted}`,
    ]);
  }
  if (s.followUpsShown > 0) {
    list.push([
      "Follow-ups answered",
      `${s.followUpsAnswered} of ${s.followUpsShown}`,
    ]);
  }
  list.push(
    ["Check-ins", String(s.checkinViews)],
    ["Verses shared", String(s.versesShared)]
  );
  return list;
}

export default function Stats() {
  const stats = useMemo(() => computeStats(), []);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = "Your numbers | MindfulVerse";
  }, []);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

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
    <div className="stack stats-page">
      <header>
        <h1>Your numbers</h1>
        <p className="soft">Private, on this device.</p>
      </header>

      <AccountLine />

      {hasData ? (
        <>
          <dl className="stats-list">
            {rows(stats).map(([label, value]) => (
              <div key={label} className="stats-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <button type="button" className="btn secondary" onClick={copyStats}>
              {copied ? "Copied" : "Copy my numbers"}
            </button>
          </div>
        </>
      ) : (
        <div className="journal-empty">
          <p className="soft">Nothing to count yet.</p>
          <Link to="/" className="btn secondary">
            Start today
          </Link>
        </div>
      )}
    </div>
  );
}
