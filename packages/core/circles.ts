// Circles: a named group reading one surah together. The server holds only the
// name, surah and optional portion (a focus verse, or verse..verseEnd for the
// week); see migrations/20261108120000_circles.sql and
// 20261121100000_circles-portion-members-history.sql. Reflection text never
// leaves the device through here: a kept reflection sends only the install id,
// circle code and local date, for an anonymous weekly count, and membership is
// counted by install id alone. A device can be in up to three circles; the
// first is the one Home leads with. All of it is cached so Home works offline.
import { clearCircleSurah, parseSurahNumber } from "./circleSurah";
import { getInstallId, localDay } from "./installId";
import { onEntryAdded } from "./journal";
import { insforge } from "./sync/insforge";

/** a-z and 2-9 without i, l, o, 0, 1. Must match the SQL CHECK. */
export const CIRCLE_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CIRCLE_CODE_LENGTH = 6;
export const CIRCLE_NAME_MAX = 40;
export const CIRCLE_VERSE_MAX = 286;

export interface Circle {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
  /** Last verse of this week's portion; null for a single focus verse or the
   *  whole surah. Only set alongside verse, and never before it. */
  verseEnd: number | null;
  /** Epoch ms of the owner's last change. */
  updatedAt: number;
}

export interface CircleDraft {
  name: string;
  surah: number;
  verse?: number | null;
  verseEnd?: number | null;
}

export type CirclePatch = Partial<CircleDraft>;

export type CircleErrorKind =
  | "invalid"
  | "signed-out"
  | "not-found"
  | "network"
  | "unknown";

export interface CircleError {
  kind: CircleErrorKind;
  /** Calm copy, safe to show as is. */
  message: string;
}

export type CircleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CircleError };

export type CircleLink =
  | { kind: "code"; code: string }
  | { kind: "surah"; surah: number };

const ERROR_COPY: Record<CircleErrorKind, string> = {
  invalid: "Check the circle's name, surah and verse.",
  network: "Couldn't reach the server. Check your connection and try again.",
  "not-found": "This circle isn't available any more.",
  "signed-out": "Sign in to start or change a circle.",
  unknown: "Something went wrong. Please try again.",
};

export function circleError(kind: CircleErrorKind): CircleError {
  return { kind, message: ERROR_COPY[kind] };
}

const CODE_PATTERN = /^[a-hjkmnp-z2-9]{6}$/u;
const WHITESPACE = /\s+/gu;
const CIRCLE_PATH = /(?:^|\/)circle\/([^/?#]+)/iu;
const SURAH_DIGITS = /^\d{1,3}$/u;
const BYTE_RANGE = 256;
const MAX_CREATE_ATTEMPTS = 3;
const LIST_LIMIT = 50;
const COLUMNS = "code, name, surah, verse, verse_end, updated_at";

export function isCircleCode(raw: unknown): raw is string {
  return typeof raw === "string" && CODE_PATTERN.test(raw);
}

/** Trims and collapses whitespace, caps at 40 characters. Null when empty. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const collapsed = raw.replaceAll(WHITESPACE, " ").trim();
  const capped = [...collapsed].slice(0, CIRCLE_NAME_MAX).join("").trimEnd();
  return capped.length > 0 ? capped : null;
}

export function parseVerseNumber(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 1 &&
    n <= CIRCLE_VERSE_MAX
    ? n
    : null;
}

/** Accepts a bare code, an old surah number, a path (/circle/x) or a full
 *  web or app link. Old numeric links stay surah links. */
export function parseCircleLink(raw: unknown): CircleLink | null {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return null;
  }
  const text = String(raw).trim();
  const match = CIRCLE_PATH.exec(text);
  let segment = match?.[1] ?? text;
  try {
    segment = decodeURIComponent(segment);
  } catch {
    return null;
  }
  segment = segment.trim().toLowerCase();
  if (isCircleCode(segment)) {
    return { code: segment, kind: "code" };
  }
  if (SURAH_DIGITS.test(segment)) {
    const surah = parseSurahNumber(segment);
    return surah === null ? null : { kind: "surah", surah };
  }
  return null;
}

export function circlePath(code: string): string {
  return `/circle/${code}`;
}

export type RandomBytes = (length: number) => Uint8Array;

const defaultRandomBytes: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  const host = globalThis as {
    crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
  };
  if (typeof host.crypto?.getRandomValues === "function") {
    host.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Hermes without a getRandomValues shim: codes are links, not secrets, and
  // a collision only costs a retry on insert.
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * BYTE_RANGE);
  }
  return bytes;
};

export function newCircleCode(
  random: RandomBytes = defaultRandomBytes
): string {
  const size = CIRCLE_CODE_ALPHABET.length;
  // Rejection sampling keeps every character equally likely.
  const limit = BYTE_RANGE - (BYTE_RANGE % size);
  let code = "";
  while (code.length < CIRCLE_CODE_LENGTH) {
    for (const byte of random(CIRCLE_CODE_LENGTH)) {
      if (byte < limit && code.length < CIRCLE_CODE_LENGTH) {
        code += CIRCLE_CODE_ALPHABET[byte % size];
      }
    }
  }
  return code;
}

// ---- Server ----

export interface CircleRow {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
  verse_end?: number | null;
  updated_at: string;
}

export interface CircleInsert {
  code: string;
  name: string;
  surah: number;
  verse: number | null;
  verse_end: number | null;
}

export type CircleUpdate = Partial<Omit<CircleInsert, "code">>;

interface ApiResponse<T> {
  data: T | null;
  error: unknown;
}

/** The server surface, injectable for tests. */
export interface CircleApi {
  insert(row: CircleInsert): Promise<ApiResponse<CircleRow[]>>;
  update(code: string, patch: CircleUpdate): Promise<ApiResponse<CircleRow[]>>;
  remove(code: string): Promise<ApiResponse<Pick<CircleRow, "code">[]>>;
  listMine(): Promise<ApiResponse<CircleRow[]>>;
  get(code: string): Promise<ApiResponse<CircleRow[]>>;
}

export const insforgeCircleApi: CircleApi = {
  get: async (code) =>
    await insforge.database.rpc("get_circle", { p_code: code }),
  insert: async (row) =>
    await insforge.database.from("circles").insert([row]).select(COLUMNS),
  listMine: async () =>
    await insforge.database
      .from("circles")
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT),
  remove: async (code) =>
    await insforge.database
      .from("circles")
      .delete()
      .eq("code", code)
      .select("code"),
  update: async (code, patch) =>
    await insforge.database
      .from("circles")
      .update(patch)
      .eq("code", code)
      .select(COLUMNS),
};

export function circleFromRow(row: unknown): Circle | null {
  const r = row as Partial<CircleRow> | null;
  const code = r?.code;
  const name = normalizeName(r?.name);
  const surah = parseSurahNumber(r?.surah);
  if (!isCircleCode(code) || name === null || surah === null) {
    return null;
  }
  const updatedAt = Date.parse(String(r?.updated_at ?? ""));
  const verse = parseVerseNumber(r?.verse);
  const end = parseVerseNumber(r?.verse_end);
  return {
    code,
    name,
    surah,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    verse,
    verseEnd: verse !== null && end !== null && end >= verse ? end : null,
  };
}

function errorCode(err: unknown): string {
  const e = err as { code?: unknown; statusCode?: unknown; status?: unknown };
  return String(e?.code ?? e?.statusCode ?? e?.status ?? "");
}

function isDuplicate(err: unknown): boolean {
  const code = errorCode(err);
  return code === "23505" || code === "409";
}

const SIGNED_OUT_CODES = new Set([
  "42501",
  "PGRST301",
  "PGRST302",
  "401",
  "403",
]);
const INVALID_CODES = new Set(["23514", "23502", "22P02", "22001", "400"]);

export function toCircleError(err: unknown): CircleError {
  const code = errorCode(err);
  if (SIGNED_OUT_CODES.has(code)) {
    return circleError("signed-out");
  }
  if (INVALID_CODES.has(code)) {
    return circleError("invalid");
  }
  const message = String((err as { message?: unknown })?.message ?? "");
  if (err instanceof TypeError || /network|fetch|timeout/iu.test(message)) {
    return circleError("network");
  }
  return circleError("unknown");
}

function fail<T>(error: CircleError): CircleResult<T> {
  return { error, ok: false };
}

function firstCircle(data: CircleRow[] | null): CircleResult<Circle> {
  const circle = circleFromRow(data?.[0]);
  return circle ? { ok: true, value: circle } : fail(circleError("not-found"));
}

type Portion = Pick<CircleInsert, "verse" | "verse_end">;

/** A focus verse, or a verse..verseEnd range; null when either is malformed
 *  or the range runs backwards. Absent means the whole surah. */
function checkPortion(
  verseIn: number | null | undefined,
  endIn: number | null | undefined
): Portion | null {
  const verse =
    verseIn === null || verseIn === undefined ? null : parseVerseNumber(verseIn);
  const end =
    endIn === null || endIn === undefined ? null : parseVerseNumber(endIn);
  const badVerse = verse === null && verseIn !== null && verseIn !== undefined;
  const badEnd = end === null && endIn !== null && endIn !== undefined;
  if (badVerse || badEnd) {
    return null;
  }
  if (end !== null && (verse === null || end < verse)) {
    return null;
  }
  // A one-verse range is just a focus verse.
  return { verse, verse_end: end === verse ? null : end };
}

function validateDraft(
  draft: CircleDraft
): CircleResult<Omit<CircleInsert, "code">> {
  const name = normalizeName(draft.name);
  const surah = parseSurahNumber(draft.surah);
  const portion = checkPortion(draft.verse, draft.verseEnd);
  if (name === null || surah === null || portion === null) {
    return fail(circleError("invalid"));
  }
  return { ok: true, value: { name, surah, ...portion } };
}

/** Signed-in only. Retries with a fresh code if the code is taken, and joins
 *  the new circle on this device. */
export async function createCircle(
  draft: CircleDraft,
  api: CircleApi = insforgeCircleApi,
  random: RandomBytes = defaultRandomBytes
): Promise<CircleResult<Circle>> {
  const valid = validateDraft(draft);
  if (!valid.ok) {
    return valid;
  }
  try {
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const { data, error } = await api.insert({
        ...valid.value,
        code: newCircleCode(random),
      });
      if (!error) {
        const result = firstCircle(data);
        if (result.ok) {
          joinCircle(result.value);
        }
        return result;
      }
      if (!isDuplicate(error)) {
        return fail(toCircleError(error));
      }
    }
    return fail(circleError("unknown"));
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Owner only. Keeps this device's joined copy in step. */
export async function updateCircle(
  code: string,
  patch: CirclePatch,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle>> {
  if (!isCircleCode(code)) {
    return fail(circleError("invalid"));
  }
  const update: CircleUpdate = {};
  if (patch.name !== undefined) {
    const name = normalizeName(patch.name);
    if (name === null) {
      return fail(circleError("invalid"));
    }
    update.name = name;
  }
  if (patch.surah !== undefined) {
    const surah = parseSurahNumber(patch.surah);
    if (surah === null) {
      return fail(circleError("invalid"));
    }
    update.surah = surah;
  }
  if (patch.verse !== undefined || patch.verseEnd !== undefined) {
    // The portion moves as one: a new start without an end clears the end.
    const portion = checkPortion(patch.verse, patch.verseEnd);
    if (portion === null) {
      return fail(circleError("invalid"));
    }
    update.verse = portion.verse;
    update.verse_end = portion.verse_end;
  }
  try {
    const { data, error } = await api.update(code, update);
    if (error) {
      return fail(toCircleError(error));
    }
    const result = firstCircle(data);
    if (result.ok) {
      writeJoined(result.value);
    }
    return result;
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Owner only. Leaves the circle on this device too if it was joined. */
export async function deleteCircle(
  code: string,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<null>> {
  if (!isCircleCode(code)) {
    return fail(circleError("invalid"));
  }
  try {
    const { data, error } = await api.remove(code);
    if (error) {
      return fail(toCircleError(error));
    }
    if (!data?.length) {
      return fail(circleError("not-found"));
    }
    leaveCircle(code);
    return { ok: true, value: null };
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** The signed-in person's own circles, most recently changed first. */
export async function listMyCircles(
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle[]>> {
  try {
    const { data, error } = await api.listMine();
    if (error) {
      return fail(toCircleError(error));
    }
    const circles = (data ?? [])
      .map(circleFromRow)
      .filter((c): c is Circle => c !== null);
    return { ok: true, value: circles };
  } catch (error) {
    return fail(toCircleError(error));
  }
}

/** Reads one circle by code; works signed out. */
export async function fetchCircle(
  code: string,
  api: CircleApi = insforgeCircleApi
): Promise<CircleResult<Circle>> {
  if (!isCircleCode(code)) {
    return fail(circleError("not-found"));
  }
  try {
    const { data, error } = await api.get(code);
    if (error) {
      return fail(toCircleError(error));
    }
    return firstCircle(data);
  } catch (error) {
    return fail(toCircleError(error));
  }
}

// ---- Device-local membership ----

/** One device can be in this many circles at once. */
export const MAX_JOINED_CIRCLES = 3;

// v2 holds every joined circle, the one Home leads with first. v1 held a
// single circle and is moved into v2 the first time it's read.
const JOINED_KEY = "mindfulverse.circles.v2";
const OLD_JOINED_KEY = "mindfulverse.circle.v1";

type Listener = (circle: Circle | null) => void;
const listeners = new Set<Listener>();

function notify(): void {
  const primary = getJoinedCircle();
  for (const listener of listeners) {
    listener(primary);
  }
}

/** Called after a join, leave, reorder or a refresh that changed a cached
 *  circle, with the circle Home leads with (or null). Read the whole list
 *  with getJoinedCircles(). */
export function onJoinedCircleChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function fromStored(raw: unknown): Circle | null {
  const parsed = raw as Partial<Circle> | null;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  return circleFromRow({
    ...parsed,
    updated_at: new Date(Number(parsed.updatedAt) || 0).toISOString(),
    verse_end: parsed.verseEnd,
  });
}

function readList(): Circle[] {
  try {
    const raw = localStorage.getItem(JOINED_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed) ? parsed : [];
      return list
        .map(fromStored)
        .filter((c): c is Circle => c !== null)
        .slice(0, MAX_JOINED_CIRCLES);
    }
    const old = localStorage.getItem(OLD_JOINED_KEY);
    if (old === null) {
      return [];
    }
    const migrated = fromStored(JSON.parse(old) as unknown);
    const list = migrated ? [migrated] : [];
    localStorage.setItem(JOINED_KEY, JSON.stringify(list));
    localStorage.removeItem(OLD_JOINED_KEY);
    return list;
  } catch {
    return [];
  }
}

function writeList(list: Circle[]): boolean {
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify(list));
  } catch {
    return false;
  }
  notify();
  return true;
}

function toStored(circle: Circle): Circle | null {
  return fromStored(circle);
}

/** Every circle this device is in; the first is the one Home leads with. */
export function getJoinedCircles(): Circle[] {
  return readList();
}

/** The circle Home leads with, or null. */
export function getJoinedCircle(): Circle | null {
  return readList()[0] ?? null;
}

export function isCircleJoined(code: string): boolean {
  return readList().some((c) => c.code === code);
}

/** True when joining this circle needs another to be left first. */
export function circlesFull(code?: string): boolean {
  const list = readList();
  return (
    list.length >= MAX_JOINED_CIRCLES &&
    !list.some((c) => c.code === code)
  );
}

/** Updates a joined circle's cached copy in place; a no-op for any other. */
function writeJoined(circle: Circle): void {
  const valid = toStored(circle);
  if (!valid) {
    return;
  }
  const list = readList();
  const at = list.findIndex((c) => c.code === valid.code);
  if (at === -1) {
    return;
  }
  list[at] = valid;
  writeList(list);
}

/** Joins a circle on this device, or brings an already joined one to the
 *  front so Home leads with it. Returns false for a malformed circle or when
 *  the device is already in MAX_JOINED_CIRCLES others. */
export function joinCircle(circle: Circle): boolean {
  const valid = toStored(circle);
  if (!valid) {
    return false;
  }
  const list = readList();
  const rest = list.filter((c) => c.code !== valid.code);
  if (rest.length >= MAX_JOINED_CIRCLES) {
    return false;
  }
  if (!writeList([valid, ...rest])) {
    return false;
  }
  // A named circle replaces an old numeric circle link.
  clearCircleSurah();
  void touchCircleMembership(valid.code);
  return true;
}

/** Leaves one circle (the one Home leads with, by default). */
export function leaveCircle(code?: string): void {
  const list = readList();
  const target = code ?? list[0]?.code;
  if (!target || !list.some((c) => c.code === target)) {
    return;
  }
  if (writeList(list.filter((c) => c.code !== target))) {
    void sendLeave(target);
  }
}

function sameCircle(a: Circle, b: Circle): boolean {
  return (
    a.name === b.name &&
    a.surah === b.surah &&
    a.verse === b.verse &&
    a.verseEnd === b.verseEnd &&
    a.updatedAt === b.updatedAt
  );
}

async function refreshOne(
  cached: Circle,
  fetcher: (code: string) => Promise<CircleResult<Circle>>
): Promise<Circle | null> {
  const result = await fetcher(cached.code);
  if (result.ok) {
    if (isCircleJoined(cached.code) && !sameCircle(cached, result.value)) {
      writeJoined(result.value);
    }
    void touchCircleMembership(cached.code);
    return result.value;
  }
  if (result.error.kind === "not-found") {
    leaveCircle(cached.code);
    return null;
  }
  return cached;
}

/** Refetches the circle Home leads with. Leaves it and resolves the next one
 *  (or null) when it's gone; keeps the cached copy when offline or on any
 *  other error. */
export async function refreshJoinedCircle(
  fetcher: (code: string) => Promise<CircleResult<Circle>> = fetchCircle
): Promise<Circle | null> {
  const cached = getJoinedCircle();
  if (!cached) {
    return null;
  }
  const fresh = await refreshOne(cached, fetcher);
  return fresh === null || !isCircleJoined(cached.code)
    ? getJoinedCircle()
    : (getJoinedCircle() ?? fresh);
}

/** Refetches every joined circle; resolves the list as it stands after. */
export async function refreshJoinedCircles(
  fetcher: (code: string) => Promise<CircleResult<Circle>> = fetchCircle
): Promise<Circle[]> {
  await Promise.all(readList().map((c) => refreshOne(c, fetcher)));
  return readList();
}

// ---- Anonymous member count ----

export type CircleMemberCall = (
  fn: "circle_touch" | "circle_leave",
  args: { p_code: string; p_install_id: string }
) => Promise<unknown>;

const TOUCHED_KEY = "mindfulverse.circleTouched.v1";

const callMemberRpc: CircleMemberCall = async (fn, args) => {
  const { error } = await insforge.database.rpc(fn, args);
  return error;
};

let memberCall: CircleMemberCall = callMemberRpc;

/** Swaps the join and leave calls that joinCircle and leaveCircle make in the
 *  background; for tests. Returns a function that restores the real ones. */
export function setCircleMemberCall(call: CircleMemberCall): () => void {
  memberCall = call;
  return () => {
    memberCall = callMemberRpc;
  };
}

function readTouched(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOUCHED_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/** Tells the server this device is in the circle, at most once per circle and
 *  local day. Sends only the install id and code. Never rejects. */
export async function touchCircleMembership(
  code: string,
  now: Date = new Date(),
  call: CircleMemberCall = memberCall
): Promise<boolean> {
  try {
    if (!isCircleCode(code)) {
      return false;
    }
    const day = localDay(now);
    const touched = readTouched();
    if (touched[code] === day) {
      return false;
    }
    const error = await call("circle_touch", {
      p_code: code,
      p_install_id: getInstallId(),
    });
    if (!error) {
      // Keep only circles still joined, so the record stays small.
      const kept: Record<string, string> = { [code]: day };
      for (const c of readList()) {
        if (c.code !== code && touched[c.code]) {
          kept[c.code] = touched[c.code] ?? "";
        }
      }
      localStorage.setItem(TOUCHED_KEY, JSON.stringify(kept));
    }
    return true;
  } catch {
    return false;
  }
}

async function sendLeave(code: string): Promise<void> {
  const call = memberCall;
  try {
    const touched = readTouched();
    delete touched[code];
    localStorage.setItem(TOUCHED_KEY, JSON.stringify(touched));
    await call("circle_leave", { p_code: code, p_install_id: getInstallId() });
  } catch {
    // Not reached: the member drops out of the count after 30 days anyway.
  }
}

export type FetchCount = (
  fn: "circle_member_count" | "circle_week_count",
  code: string
) => Promise<ApiResponse<unknown>>;

const fetchCountFromInsforge: FetchCount = async (fn, code) =>
  await insforge.database.rpc(fn, { p_code: code });

/** Devices in the circle that opened the app in the last 30 days. Null on any
 *  error. */
export async function fetchCircleMemberCount(
  code: string,
  fetcher: FetchCount = fetchCountFromInsforge
): Promise<number | null> {
  if (!isCircleCode(code)) {
    return null;
  }
  try {
    const { data, error } = await fetcher("circle_member_count", code);
    return error ? null : countFrom(data, "circle_member_count");
  } catch {
    return null;
  }
}

// ---- Surahs read together ----

export interface CircleHistoryEntry {
  surah: number;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms, or null for the surah the circle is reading now. */
  endedAt: number | null;
}

export type FetchHistory = (code: string) => Promise<ApiResponse<unknown>>;

const fetchHistoryFromInsforge: FetchHistory = async (code) =>
  await insforge.database.rpc("circle_history", { p_code: code });

export function historyFromRows(data: unknown): CircleHistoryEntry[] {
  if (!Array.isArray(data)) {
    return [];
  }
  const out: CircleHistoryEntry[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const surah = parseSurahNumber(row?.surah);
    const startedAt = Date.parse(String(row?.started_at ?? ""));
    const ended = row?.ended_at ? Date.parse(String(row.ended_at)) : Number.NaN;
    if (surah !== null && Number.isFinite(startedAt)) {
      out.push({
        endedAt: Number.isFinite(ended) ? ended : null,
        startedAt,
        surah,
      });
    }
  }
  return out;
}

/** The surahs a circle has read, oldest first. Empty on any error. */
export async function fetchCircleHistory(
  code: string,
  fetcher: FetchHistory = fetchHistoryFromInsforge
): Promise<CircleHistoryEntry[]> {
  if (!isCircleCode(code)) {
    return [];
  }
  try {
    const { data, error } = await fetcher(code);
    return error ? [] : historyFromRows(data);
  } catch {
    return [];
  }
}

/** Surahs the circle has finished, oldest first, each once. */
export function finishedSurahs(history: CircleHistoryEntry[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const h of history) {
    if (h.endedAt !== null && !seen.has(h.surah)) {
      seen.add(h.surah);
      out.push(h.surah);
    }
  }
  return out;
}

// ---- Anonymous weekly count ----

/** The one row a kept reflection sends: no text, no verse. */
export interface CircleReflectionRow {
  install_id: string;
  circle_code: string;
  day: string;
}

/** Resolves to the insert error, or null on success. */
export type SendCircleReflection = (
  row: CircleReflectionRow
) => Promise<unknown>;

export type FetchWeekCount = (code: string) => Promise<ApiResponse<unknown>>;

const LAST_REFLECTION_KEY = "mindfulverse.circleReflection.v1";
const MIN_SHOWN_COUNT = 2;

const sendReflectionToInsforge: SendCircleReflection = async (row) => {
  const { error } = await insforge.database
    .from("circle_reflections")
    .insert([row]);
  return error;
};

const fetchWeekCountFromInsforge: FetchWeekCount = async (code) =>
  await insforge.database.rpc("circle_week_count", { p_code: code });

function readSent(): string[] {
  try {
    const raw = localStorage.getItem(LAST_REFLECTION_KEY);
    if (!raw) {
      return [];
    }
    // v1 stored one "code:day" string; now a list, one per joined circle.
    if (!raw.startsWith("[")) {
      return [raw];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Sends today's row for each joined circle, once per circle and local day.
 *  A no-op outside a circle. Resolves to whether any row was attempted; never
 *  rejects. */
export async function recordCircleReflection(
  now: Date = new Date(),
  send: SendCircleReflection = sendReflectionToInsforge
): Promise<boolean> {
  try {
    const day = localDay(now);
    const codes = readList().map((c) => c.code);
    const sent = new Set(readSent().filter((k) => k.endsWith(`:${day}`)));
    let attempted = false;
    for (const code of codes) {
      const key = `${code}:${day}`;
      if (sent.has(key)) {
        continue;
      }
      attempted = true;
      const error = await send({
        circle_code: code,
        day,
        install_id: getInstallId(),
      });
      if (!error || isDuplicate(error)) {
        sent.add(key);
      }
    }
    localStorage.setItem(LAST_REFLECTION_KEY, JSON.stringify([...sent]));
    return attempted;
  } catch {
    return false;
  }
}

let unwireReflections: (() => void) | null = null;

/** Counts every kept journal reflection toward the joined circle. Call once
 *  at app startup; repeat calls are no-ops. Returns an unsubscribe. */
export function wireCircleReflections(
  send: SendCircleReflection = sendReflectionToInsforge
): () => void {
  if (!unwireReflections) {
    const off = onEntryAdded(() => {
      void recordCircleReflection(new Date(), send);
    });
    unwireReflections = () => {
      off();
      unwireReflections = null;
    };
  }
  return unwireReflections;
}

function countFrom(data: unknown, key: string): number | null {
  const value = Array.isArray(data)
    ? (data[0] as Record<string, unknown> | undefined)?.[key]
    : data;
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** Distinct installs in the circle that kept a reflection in the last 7 days
 *  (server UTC date). Null on any error. */
export async function fetchCircleWeekCount(
  code: string,
  fetcher: FetchWeekCount = fetchWeekCountFromInsforge
): Promise<number | null> {
  if (!isCircleCode(code)) {
    return null;
  }
  try {
    const { data, error } = await fetcher(code);
    return error ? null : countFrom(data, "circle_week_count");
  } catch {
    return null;
  }
}

/** "3 in Friday friends reflected this week", or without the name where the
 *  circle is already named above it. Null below 2 so a lone member is never
 *  singled out. */
export function circleCountLine(name: string | null, n: number): string | null {
  if (!Number.isFinite(n) || n < MIN_SHOWN_COUNT) {
    return null;
  }
  const who = name === null ? "people" : `in ${name}`;
  return `${Math.floor(n)} ${who} reflected this week.`;
}

/** "5 in Friday friends · 3 reflected this week", "5 people in this circle",
 *  or just the reflection line. Each number shows only at 2 or more, so no one
 *  is singled out; null when neither does. */
export function circleMembersLine(
  name: string | null,
  members: number | null,
  reflected: number | null
): string | null {
  const shownMembers =
    members !== null && Number.isFinite(members) && members >= MIN_SHOWN_COUNT
      ? Math.floor(members)
      : null;
  const shownReflected =
    reflected !== null &&
    Number.isFinite(reflected) &&
    reflected >= MIN_SHOWN_COUNT
      ? Math.floor(reflected)
      : null;
  if (shownMembers === null) {
    return shownReflected === null ? null : circleCountLine(name, shownReflected);
  }
  const who = name === null ? "people in this circle" : `in ${name}`;
  const base = `${shownMembers} ${who}`;
  return shownReflected === null
    ? `${base}.`
    : `${base} · ${shownReflected} reflected this week.`;
}
