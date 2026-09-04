// Local-only progress: visit streak + tadabbur session completion/resume.
// v0 has no accounts — everything lives in localStorage, mirroring journal.ts.

const VISITS_KEY = "mindfulverse.visits.v1"; // string[] of YYYY-MM-DD
const SESSIONS_KEY = "mindfulverse.sessionProgress.v1";

export interface SessionProgress {
  /** Highest step index reached (intro = -1). */
  step: number;
  completedAt?: number; // epoch ms, present once finished
}

type SessionProgressMap = Record<string, SessionProgress>;

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function readVisits(): string[] {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Record today's visit (idempotent). Call once on app open. */
export function recordVisit(): void {
  const visits = readVisits();
  const t = today();
  if (!visits.includes(t)) {
    visits.push(t);
    // keep at most a year of history
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits.slice(-366)));
  }
}

/** Consecutive days ending today (or yesterday, so a morning visit keeps the chain). */
export function currentStreak(): number {
  const visits = new Set(readVisits());
  if (visits.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // allow the chain to be anchored at yesterday if today hasn't been recorded yet
  if (!visits.has(today())) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    const key = `${cursor.getFullYear()}-${m}-${day}`;
    if (!visits.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function totalVisitDays(): number {
  return readVisits().length;
}

function readSessions(): SessionProgressMap {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as SessionProgressMap) : {};
  } catch {
    return {};
  }
}

function writeSessions(map: SessionProgressMap): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(map));
}

export function getSessionProgress(id: string): SessionProgress | undefined {
  return readSessions()[id];
}

export function getAllSessionProgress(): Record<string, SessionProgress> {
  return readSessions();
}

/** Record the furthest step reached in a session (never regresses). */
export function recordSessionStep(id: string, step: number): void {
  const map = readSessions();
  const prev = map[id];
  if (!prev || step > prev.step) {
    map[id] = { ...prev, step };
    writeSessions(map);
  }
}

export function recordSessionComplete(id: string): void {
  const map = readSessions();
  map[id] = { ...(map[id] ?? { step: 0 }), completedAt: Date.now() };
  writeSessions(map);
}
