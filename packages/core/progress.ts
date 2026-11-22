import { localDay } from "./installId";
import { markProgressDirty } from "./syncFlags";
// Progress: visit streak + tadabbur session completion/resume. Lives in
// localStorage, mirroring journal.ts; sync/engine.ts backs it up when signed in.
import type { LocalProgress } from "./types";

const VISITS_KEY = "mindfulverse.visits.v1"; // string[] of YYYY-MM-DD
const SESSIONS_KEY = "mindfulverse.sessionProgress.v1";

export interface SessionProgress {
  /** Highest step index reached (intro = -1). */
  step: number;
  completedAt?: number; // epoch ms, present once finished
}

type SessionProgressMap = Record<string, SessionProgress>;

const today = (): string => localDay(new Date());

/** Storage can be blocked or full; a failed write is dropped, never thrown. */
function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
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
    if (safeSet(VISITS_KEY, visits.slice(-366))) {
      markProgressDirty();
    }
  }
}

/** Consecutive days ending today (or yesterday, so a morning visit keeps the chain). */
export function currentStreak(): number {
  const visits = new Set(readVisits());
  if (visits.size === 0) {
    return 0;
  }
  let streak = 0;
  const cursor = new Date();
  // allow the chain to be anchored at yesterday if today hasn't been recorded yet
  if (!visits.has(today())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    if (!visits.has(localDay(cursor))) {
      break;
    }
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Whole days between `today` and the latest visit before it; 0 when there
 *  is none. Both are YYYY-MM-DD local days. */
export function daysAwayBefore(visits: string[], todayDay: string): number {
  let latest = "";
  for (const v of visits) {
    if (v < todayDay && v > latest) {
      latest = v;
    }
  }
  if (!latest) {
    return 0;
  }
  const ms =
    Date.parse(`${todayDay}T12:00:00Z`) - Date.parse(`${latest}T12:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : 0;
}

/** Days since the visit before today: 1 means yesterday, 0 means a first
 *  visit. Home uses it to welcome someone back after a break. */
export function daysAway(): number {
  return daysAwayBefore(readVisits(), today());
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

function writeSessions(map: SessionProgressMap): boolean {
  return safeSet(SESSIONS_KEY, map);
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
    if (writeSessions(map)) {
      markProgressDirty();
    }
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
    if (safeSet(SURAH_TADABBUR_KEY, map)) {
      markProgressDirty();
    }
  }
}

export function getSurahTadabbur(
  surah: number
): SurahTadabburProgress | undefined {
  return readSurahTadabbur()[String(surah)];
}

/** The surah most recently pondered, for a "continue" affordance. */
export function latestSurahTadabbur(): { surah: number; ayah: number } | null {
  const map = readSurahTadabbur();
  let best: { surah: number; ayah: number; at: number } | null = null;
  for (const [s, p] of Object.entries(map)) {
    if (!best || p.updatedAt > best.at) {
      best = { at: p.updatedAt, ayah: p.ayah, surah: Number(s) };
    }
  }
  return best ? { ayah: best.ayah, surah: best.surah } : null;
}

const LAST_READ_KEY = "mindfulverse.lastRead.v1";

export interface LastRead {
  surah: number;
  ayah: number;
  at: number; // epoch ms
}

export function recordLastRead(surah: number, ayah: number): void {
  const prev = getLastRead();
  if (prev?.surah === surah && prev.ayah === ayah) {
    return; // same place: nothing to write or sync
  }
  const next: LastRead = { at: Date.now(), ayah, surah };
  if (safeSet(LAST_READ_KEY, next)) {
    markProgressDirty();
  }
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
  if (writeSessions(map)) {
    markProgressDirty();
  }
}

export function getLocalProgress(): LocalProgress {
  return {
    lastRead: getLastRead(),
    sessionProgress: readSessions(),
    surahTadabbur: readSurahTadabbur(),
    visits: readVisits(),
  };
}

/** Sync engine writes merged state back; never marks dirty. */
export function replaceLocalProgress(p: LocalProgress): void {
  safeSet(VISITS_KEY, p.visits);
  safeSet(SESSIONS_KEY, p.sessionProgress);
  safeSet(SURAH_TADABBUR_KEY, p.surahTadabbur);
  if (p.lastRead) {
    safeSet(LAST_READ_KEY, p.lastRead);
  }
}

/** Wipe every progress key on this device (account-switch "start fresh"). */
export function clearLocalProgress(): void {
  for (const key of [
    VISITS_KEY,
    SESSIONS_KEY,
    SURAH_TADABBUR_KEY,
    LAST_READ_KEY,
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage blocked */
    }
  }
}
