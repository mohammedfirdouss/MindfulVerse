// Local-only progress: visit streak + tadabbur session completion/resume.
// v0 has no accounts — everything lives in localStorage, mirroring journal.ts.
import type { LocalProgress } from "./merge";
import { markProgressDirty } from "./syncFlags";

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
    markProgressDirty();
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
    markProgressDirty();
  }
}

const SURAH_TADABBUR_KEY = "mindfulverse.surahTadabbur.v1";

export interface SurahTadabburProgress {
  /** Last ayah number the user pondered in this surah. */
  ayah: number;
  updatedAt: number; // epoch ms
}

type SurahTadabburMap = Record<string, SurahTadabburProgress>;

function readSurahTadabbur(): SurahTadabburMap {
  try {
    const raw = localStorage.getItem(SURAH_TADABBUR_KEY);
    return raw ? (JSON.parse(raw) as SurahTadabburMap) : {};
  } catch {
    return {};
  }
}

/** Record the furthest ayah pondered in a surah (never regresses). */
export function recordSurahTadabbur(surah: number, ayah: number): void {
  const map = readSurahTadabbur();
  const prev = map[String(surah)];
  if (!prev || ayah > prev.ayah) {
    map[String(surah)] = { ayah, updatedAt: Date.now() };
    localStorage.setItem(SURAH_TADABBUR_KEY, JSON.stringify(map));
    markProgressDirty();
  }
}

export function getSurahTadabbur(surah: number): SurahTadabburProgress | undefined {
  return readSurahTadabbur()[String(surah)];
}

/** The surah most recently pondered, for a "continue" affordance. */
export function latestSurahTadabbur(): { surah: number; ayah: number } | null {
  const map = readSurahTadabbur();
  let best: { surah: number; ayah: number; at: number } | null = null;
  for (const [s, p] of Object.entries(map)) {
    if (!best || p.updatedAt > best.at) {
      best = { surah: Number(s), ayah: p.ayah, at: p.updatedAt };
    }
  }
  return best ? { surah: best.surah, ayah: best.ayah } : null;
}

const LAST_READ_KEY = "mindfulverse.lastRead.v1";

export interface LastRead {
  surah: number;
  ayah: number;
  at: number; // epoch ms
}

export function recordLastRead(surah: number, ayah: number): void {
  localStorage.setItem(
    LAST_READ_KEY,
    JSON.stringify({ surah, ayah, at: Date.now() } satisfies LastRead)
  );
  markProgressDirty();
}

export function getLastRead(): LastRead | null {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? (JSON.parse(raw) as LastRead) : null;
  } catch {
    return null;
  }
}

export function recordSessionComplete(id: string): void {
  const map = readSessions();
  map[id] = { ...(map[id] ?? { step: 0 }), completedAt: Date.now() };
  writeSessions(map);
  markProgressDirty();
}

export function getLocalProgress(): LocalProgress {
  return {
    visits: readVisits(),
    sessionProgress: readSessions(),
    surahTadabbur: readSurahTadabbur(),
    lastRead: getLastRead(),
  };
}

/** Sync engine writes merged state back; never marks dirty. */
export function replaceLocalProgress(p: LocalProgress): void {
  localStorage.setItem(VISITS_KEY, JSON.stringify(p.visits));
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(p.sessionProgress));
  localStorage.setItem(SURAH_TADABBUR_KEY, JSON.stringify(p.surahTadabbur));
  if (p.lastRead) localStorage.setItem(LAST_READ_KEY, JSON.stringify(p.lastRead));
}
