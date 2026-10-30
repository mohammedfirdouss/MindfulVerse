// Follow-ups: about a week after someone keeps a tadabbur reflection with an
// "Action:", the app asks "how did it go?". Pure selection logic plus small
// device-local state helpers; the card UI lives in the web app.
import { addEntry } from "./journal";
import { parseTadabburBody } from "./tadabburBody";
import type { JournalEntry } from "./types";

export const FOLLOW_UP_MIN_MS = 7 * 86_400_000;
export const FOLLOW_UP_MAX_MS = 30 * 86_400_000;
export const FOLLOW_UP_SKIP_MS = 7 * 86_400_000;

const STATE_KEY = "mindfulverse.followups.v1";
const ANSWERS = ["Yes", "Partly", "Not yet"] as const;

export type FollowUpAnswer = (typeof ANSWERS)[number];

export interface FollowUpState {
  skipped: Record<string, number>;
  lastActedDay: string | null; // Date#toDateString()
}

export interface DueFollowUp {
  entry: JournalEntry;
  verseKey: string;
  action: string;
}

const emptyState = (): FollowUpState => ({ skipped: {}, lastActedDay: null });

/** The oldest kept tadabbur entry whose follow-up is due, or null. */
export function dueFollowUp(
  entries: JournalEntry[],
  now: Date,
  state: FollowUpState
): DueFollowUp | null {
  if (state.lastActedDay === now.toDateString()) {
    return null;
  }
  const nowMs = now.getTime();
  const answered = new Set<string>();
  for (const e of entries) {
    if (e.context?.kind === "followup" && e.context.ref) {
      answered.add(e.context.ref);
    }
  }

  let best: DueFollowUp | null = null;
  for (const entry of entries) {
    if (entry.context?.kind !== "tadabbur" || !entry.context.ref) {
      continue;
    }
    const age = nowMs - entry.createdAt;
    if (age < FOLLOW_UP_MIN_MS || age > FOLLOW_UP_MAX_MS) {
      continue;
    }
    if (answered.has(entry.id)) {
      continue;
    }
    const skippedAt = state.skipped[entry.id];
    if (skippedAt !== undefined && nowMs - skippedAt < FOLLOW_UP_SKIP_MS) {
      continue;
    }
    const action = parseTadabburBody(entry.body)?.action?.trim();
    if (!action) {
      continue;
    }
    if (!best || entry.createdAt < best.entry.createdAt) {
      best = { entry, verseKey: entry.context.ref, action };
    }
  }
  return best;
}

function defaultStore(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadFollowUpState(
  store: Pick<Storage, "getItem"> | null = defaultStore()
): FollowUpState {
  try {
    const raw = store?.getItem(STATE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return emptyState();
    }
    const { skipped, lastActedDay } = parsed as Partial<FollowUpState>;
    const clean: Record<string, number> = {};
    if (typeof skipped === "object" && skipped !== null) {
      for (const [id, at] of Object.entries(skipped)) {
        if (typeof at === "number" && Number.isFinite(at)) {
          clean[id] = at;
        }
      }
    }
    return {
      skipped: clean,
      lastActedDay: typeof lastActedDay === "string" ? lastActedDay : null,
    };
  } catch {
    return emptyState();
  }
}

export function saveFollowUpState(
  state: FollowUpState,
  store: Pick<Storage, "setItem"> | null = defaultStore()
): void {
  try {
    store?.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // storage blocked or full: the card may reappear, nothing is lost
  }
}

export function skipFollowUp(
  state: FollowUpState,
  entryId: string,
  now: Date
): FollowUpState {
  return {
    skipped: { ...state.skipped, [entryId]: now.getTime() },
    lastActedDay: now.toDateString(),
  };
}

export function answerFollowUp(
  due: DueFollowUp,
  answer: FollowUpAnswer,
  note: string,
  now: Date,
  state: FollowUpState
): FollowUpState {
  const trimmed = note.trim();
  addEntry({
    context: { kind: "followup", ref: due.entry.id },
    prompt: `How did it go? (${due.verseKey})`,
    body: trimmed ? `${answer}\n\n${trimmed}` : answer,
  });
  return { ...state, lastActedDay: now.toDateString() };
}

export function parseFollowUpBody(body: string): {
  answer: FollowUpAnswer | null;
  note: string;
} {
  const [first = "", ...rest] = body.split("\n\n");
  const answer = ANSWERS.find((a) => a === first.trim());
  if (!answer) {
    return { answer: null, note: body };
  }
  return { answer, note: rest.join("\n\n").trim() };
}
