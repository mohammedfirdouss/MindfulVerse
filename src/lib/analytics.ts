// Lightweight, privacy-respecting event logging for the v0 retention experiment.
// No third-party SDK: events are buffered in localStorage so we can inspect
// return-visit behaviour and the "would you pay?" intent signal without a backend.
//
// The kill/greenlight metrics from the plan are all derivable from these events:
//   - Day-1/3/7 return  -> "app_open" timestamps
//   - session completion -> "session_start" vs "session_complete"
//   - willingness-to-pay  -> "intent_pay_tap"

export type AnalyticsEvent =
  | { type: "app_open" }
  | { type: "session_start"; sessionId: string }
  | { type: "session_complete"; sessionId: string }
  | { type: "checkin_view"; emotion?: string }
  | { type: "journal_save"; context: string }
  | { type: "intent_pay_tap"; where: string };

interface StoredEvent {
  t: number; // epoch ms
  e: AnalyticsEvent;
}

const KEY = "mindfulverse.events.v1";
const FIRST_SEEN = "mindfulverse.firstSeen.v1";

export function track(e: AnalyticsEvent): void {
  try {
    const raw = localStorage.getItem(KEY);
    const events: StoredEvent[] = raw ? JSON.parse(raw) : [];
    events.push({ t: Date.now(), e });
    localStorage.setItem(KEY, JSON.stringify(events));
    if (import.meta.env.DEV) console.debug("[track]", e);
  } catch {
    /* analytics must never break the app */
  }
}

export function getEvents(): StoredEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredEvent[]) : [];
  } catch {
    return [];
  }
}

/** Records first-seen once, then fires app_open every load. */
export function trackAppOpen(): void {
  if (!localStorage.getItem(FIRST_SEEN)) {
    localStorage.setItem(FIRST_SEEN, String(Date.now()));
  }
  track({ type: "app_open" });
}
