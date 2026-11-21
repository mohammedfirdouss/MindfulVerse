// Pure helpers for topic sessions, ported from apps/web/src/pages/Sessions.tsx
// and SessionPlayer.tsx so order, labels and excerpts match web exactly.
import type { SessionProgress } from "@mindfulverse/core/progress";
import type { TadabburSession } from "@mindfulverse/core/types";

export type SessionState = "completed" | "inProgress" | "new";

export interface SessionRow {
  session: TadabburSession;
  state: SessionState;
  /** The furthest step reached, counting from 0; null before beginning. */
  step: number | null;
}

const EXCERPT_CHARS = 700;

export function sessionState(p: SessionProgress | undefined): SessionState {
  if (p?.completedAt !== null && p?.completedAt !== undefined) {
    return "completed";
  }
  if (p !== undefined && p.step >= 0) {
    return "inProgress";
  }
  return "new";
}

/** In progress first, then untouched, then completed (web's sort). */
export function sessionRows(
  sessions: TadabburSession[],
  progress: Record<string, SessionProgress>
): SessionRow[] {
  const rank: Record<SessionState, number> = {
    completed: 2,
    inProgress: 0,
    new: 1,
  };
  return sessions
    .map((session) => ({
      session,
      state: sessionState(progress[session.id]),
      step: progress[session.id]?.step ?? null,
    }))
    .toSorted((a, b) => rank[a.state] - rank[b.state]);
}

export function stepCountLabel(count: number): string {
  return `${count} ${count === 1 ? "step" : "steps"}`;
}

/** The step to offer "Continue from", or null when there is nothing to resume. */
export function resumeStepFor(
  p: SessionProgress | undefined,
  stepCount: number
): number | null {
  if (sessionState(p) !== "inProgress" || !p || stepCount === 0) {
    return null;
  }
  return Math.min(p.step, stepCount - 1);
}

/** How many whole paragraphs open a long commentary: up to ~700 chars, at
 *  least one, never cut mid-paragraph and never rewritten. */
export function excerptCount(paragraphs: string[]): number {
  let count = 0;
  let chars = 0;
  for (const p of paragraphs) {
    count += 1;
    chars += p.length;
    if (chars > EXCERPT_CHARS) {
      break;
    }
  }
  return count;
}

/** "Al-Baqarah 2:255", or the bare key while surah names load. */
export function verseLabel(
  verseKey: string,
  surahNames: Map<number, string>
): string {
  const name = surahNames.get(Number(verseKey.split(":")[0]));
  return name ? `${name} ${verseKey}` : verseKey;
}
