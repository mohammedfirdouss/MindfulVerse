// Edge function (Deno Subhosting): sends the daily-verse reminder over Web Push
// (platform 'web') or the Expo Push API (platform 'expo').
// Fired every 15 minutes by an InsForge schedule. Pure helpers are exported
// and unit-tested with vitest; Deno-only modules are imported dynamically
// inside the handler so this file stays importable from Node test runners.

declare const Deno: { env: { get(k: string): string | undefined } };

// Same pool + stride as packages/core/dailyVerse.ts — keep the two in sync.
export const DAILY_VERSES: string[] = [
  "94:5",
  "94:6",
  "94:1",
  "94:2",
  "94:3",
  "94:4",
  "94:7",
  "94:8",
  "93:1",
  "93:2",
  "93:3",
  "93:4",
  "93:5",
  "93:7",
  "93:11",
  "3:139",
  "39:53",
  "12:87",
  "10:57",
  "10:58",
  "10:62",
  "10:64",
  "16:96",
  "16:97",
  "2:25",
  "18:107",
  "19:96",
  "85:11",
  "39:17",
  "39:18",
  "41:30",
  "41:31",
  "46:13",
  "2:268",
  "11:115",
  "25:75",
  "76:12",
  "13:28",
  "2:186",
  "50:16",
  "20:46",
  "33:3",
  "9:51",
  "26:62",
  "3:174",
  "8:2",
  "2:255",
  "24:35",
  "2:286",
  "42:25",
  "11:90",
  "85:14",
  "57:28",
  "3:31",
  "6:54",
  "4:110",
  "23:118",
  "21:83",
  "28:16",
  "110:3",
  "3:159",
  "39:66",
  "29:69",
  "2:45",
  "2:153",
  "2:156",
  "2:157",
  "3:200",
  "103:3",
  "90:17",
  "41:35",
  "32:24",
  "16:127",
  "16:128",
  "40:55",
  "50:39",
  "31:22",
  "73:8",
  "2:201",
  "3:8",
  "25:74",
  "14:40",
  "17:80",
  "20:25",
  "20:26",
  "28:24",
  "112:1",
  "112:2",
  "112:3",
  "112:4",
  "113:1",
  "114:1",
  "33:41",
  "33:42",
  "33:43",
  "7:205",
  "76:25",
  "3:191",
  "29:60",
  "11:6",
  "17:30",
  "34:39",
  "42:19",
  "51:58",
  "67:15",
  "39:52",
  "28:73",
  "16:53",
  "55:13",
  "30:21",
  "30:22",
  "16:65",
  "16:66",
  "16:68",
  "16:69",
  "36:33",
  "36:34",
  "36:36",
  "55:5",
  "55:6",
  "55:10",
  "67:19",
  "88:17",
  "88:18",
  "88:19",
  "88:20",
  "51:47",
  "51:49",
  "78:6",
  "78:7",
  "78:8",
  "78:9",
  "78:10",
  "78:11",
  "2:152",
  "16:18",
  "27:19",
  "108:1",
  "108:2",
];

interface ZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function partsInZone(utcMs: number, timeZone: string): ZoneParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    p[part.type] = part.value;
  }
  return {
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    month: +p.month,
    year: +p.year,
  };
}

export function minutesOfDayInZone(utcMs: number, timeZone: string): number {
  const { hour, minute } = partsInZone(utcMs, timeZone);
  return hour * 60 + minute;
}

export function localDateInZone(utcMs: number, timeZone: string): string {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Days since epoch of the local calendar date in the zone. Same number as
 *  localDayIndex in packages/core/dailyVerse.ts for a reader in that zone;
 *  counting dates (not local midnights) keeps one step per day across DST. */
export function localDayIndexInZone(utcMs: number, timeZone: string): number {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Where a person's walk through the pool starts: FNV-1a of their user id.
 *  Same as verseOffset in packages/core/dailyVerse.ts. */
export function verseOffset(seed: string): number {
  let h = 0x81_1c_9d_c5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01_00_01_93) >>> 0;
  }
  return h % DAILY_VERSES.length;
}

/** The person's verse for a day: the app's verseKeyFor, seeded by user_id. */
export function verseKeyForDayIndex(dayIndex: number, userId: string): string {
  const n = DAILY_VERSES.length;
  return DAILY_VERSES[(((dayIndex * 53 + verseOffset(userId)) % n) + n) % n];
}

/** Twice the 15-minute schedule, so a run that starts late still catches the
 *  reminder; dueOccurrence() keeps the second run from sending again. */
export const DUE_WINDOW_MINUTES = 30;
const MINUTES_PER_DAY = 1440;
const MS_PER_MINUTE = 60_000;

/** Minutes since reminderTime ('HH:MM') last passed, wrapping midnight. */
function minutesSince(reminderTime: string, nowMinutes: number): number {
  const [h, m] = reminderTime.split(":").map(Number);
  const reminder = h * 60 + m;
  return (nowMinutes - reminder + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** Due when reminderTime passed less than windowMinutes ago. */
export function isDue(
  reminderTime: string,
  nowMinutes: number,
  windowMinutes = DUE_WINDOW_MINUTES
): boolean {
  return minutesSince(reminderTime, nowMinutes) < windowMinutes;
}

/** The local date ('YYYY-MM-DD') of the reminder to send now, or null when
 *  none is due or it was already sent. The date is the day the reminder time
 *  fell on, not the day of the run: a 23:50 reminder caught at 00:10 belongs
 *  to yesterday, so the 23:55 run's stamp stops a second send. */
export function dueOccurrence(
  reminderTime: string,
  nowMs: number,
  timeZone: string,
  lastSentDate: string | null | undefined,
  windowMinutes = DUE_WINDOW_MINUTES
): string | null {
  const elapsed = minutesSince(
    reminderTime,
    minutesOfDayInZone(nowMs, timeZone)
  );
  if (!(elapsed < windowMinutes)) {
    return null;
  }
  const date = localDateInZone(nowMs - elapsed * MS_PER_MINUTE, timeZone);
  // A later stamp (the welcome push after midnight) also counts as sent.
  return lastSentDate && lastSentDate >= date ? null : date;
}

/** Web Push services we are willing to POST to. A stored endpoint is user
 *  input, so anything else is skipped rather than fetched. */
const PUSH_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
]);
const PUSH_HOST_SUFFIXES = [
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.apple.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return (
    PUSH_HOSTS.has(host) ||
    PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

export const SUBSCRIPTION_PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

/** Reads every row, a page at a time, until a short page. `fetchPage` gets
 *  inclusive row bounds (as .range() takes) and must use a stable order. */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SUBSCRIPTION_PAGE_SIZE
): Promise<{ rows: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      return { error, rows };
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      return { error: null, rows };
    }
  }
}

/** Keeps the user_id list of one progress query well inside URL limits. */
export const PROGRESS_CHUNK_SIZE = 100;

interface ProgressRow {
  user_id: string;
  surah_tadabbur?: Record<string, TadabburEntry> | null;
}

/** surah_tadabbur for many users in one query per chunk. A user with no row,
 *  or in a chunk that failed, is simply absent (the reminder falls back to
 *  the daily verse). */
export async function loadTadabburByUser(
  userIds: string[],
  fetchChunk: (ids: string[]) => PromiseLike<PageResult<ProgressRow>>,
  chunkSize = PROGRESS_CHUNK_SIZE
): Promise<Map<string, Record<string, TadabburEntry>>> {
  const unique = [...new Set(userIds)];
  const byUser = new Map<string, Record<string, TadabburEntry>>();
  for (let i = 0; i < unique.length; i += chunkSize) {
    try {
      const { data, error } = await fetchChunk(unique.slice(i, i + chunkSize));
      if (error) {
        console.error("send-reminders: progress lookup failed for a chunk");
        continue;
      }
      for (const row of data ?? []) {
        if (row.surah_tadabbur) {
          byUser.set(row.user_id, row.surah_tadabbur);
        }
      }
    } catch {
      console.error("send-reminders: progress lookup failed for a chunk");
    }
  }
  return byUser;
}

/** Throws when an SDK write came back with `{ error }`; the SDK resolves
 *  rather than rejects, so an unread error would look like success. */
export function assertWritten(result: { error?: unknown }, what: string): void {
  if (result?.error) {
    throw new Error(`${what} failed`);
  }
}

export interface TadabburEntry {
  ayah: number;
  updatedAt: number;
}

/** How many days a paused tadabbur stays worth nudging about; older than this
 *  the reminder falls back to the daily verse rather than a stale "continue". */
const CONTINUE_WINDOW_DAYS = 14;

/** The most recently pondered surah that is fresh and unfinished, or null.
 *  `nextAyah` is the ayah after the last one pondered — where to resume. */
export function pickContinueTarget(
  map: Record<string, TadabburEntry> | null | undefined,
  ayahCounts: Record<string, number>,
  nowMs: number
): { surah: number; nextAyah: number } | null {
  if (!map) {
    return null;
  }
  const cutoff = nowMs - CONTINUE_WINDOW_DAYS * 86_400_000;
  let best: { surah: number; nextAyah: number; at: number } | null = null;
  for (const [key, entry] of Object.entries(map)) {
    const count = ayahCounts[key];
    if (
      !count ||
      !Number.isFinite(entry?.ayah) ||
      !Number.isFinite(entry?.updatedAt)
    ) {
      continue;
    }
    if (entry.updatedAt < cutoff || entry.ayah >= count) {
      continue;
    }
    if (!best || entry.updatedAt > best.at) {
      best = {
        at: entry.updatedAt,
        nextAyah: entry.ayah + 1,
        surah: Number(key),
      };
    }
  }
  return best ? { nextAyah: best.nextAyah, surah: best.surah } : null;
}

// --- Send step: the only place web and native diverge. Everything upstream
// (cron auth, the due window, pickContinueTarget, last_sent_date per
// row) is shared; a row's `platform` only picks the transport here.

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo Push API accepts at most 100 messages per request. */
export const EXPO_BATCH_SIZE = 100;

/** A subscription row that is due now, with its payload already built. */
export interface DueSend {
  endpoint: string;
  /** 'web' | 'expo'; absent is treated as 'web' (pre-migration rows). */
  platform?: string | null;
  keys: unknown;
  /** Local 'YYYY-MM-DD' to stamp into last_sent_date on success. */
  today: string;
  /** JSON string `{ title, body, url }` — the web push payload as-is. */
  payload: string;
}

export interface SendDeps {
  /** Web Push (VAPID). Throws with `statusCode` on failure, like web-push. */
  sendWeb(endpoint: string, keys: unknown, payload: string): Promise<void>;
  fetch: typeof fetch;
  /** Optional EXPO_ACCESS_TOKEN (enhanced push security); sent as Bearer when set. */
  expoAccessToken?: string;
  markSent(endpoint: string, today: string): Promise<void>;
  prune(endpoint: string): Promise<void>;
}

export interface SendCounts {
  /** Pushes accepted by the push service. */
  sent: number;
  pruned: number;
  /** Pushes that were not delivered. */
  failed: number;
  /** Stamps or deletes that failed after the push step. A sent row whose
   *  stamp failed is in both `sent` and here. */
  writeFailed: number;
  /** Web rows skipped because the endpoint is not a known push service. */
  blocked: number;
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: { url: string };
}

/** Same title/body/deep link as the web payload, in Expo's message shape. */
export function expoMessage(token: string, payload: string): ExpoMessage {
  const { title, body, url } = JSON.parse(payload) as {
    title: string;
    body: string;
    url: string;
  };
  return { body, data: { url }, sound: "default", title, to: token };
}

function webHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

/** Keep push tokens out of logs (Expo error messages echo the token). */
function redactTokens(s: string): string {
  return s.replaceAll(/Expo(nent)?PushToken\[[^\]]*\]/gu, "<expo-token>");
}

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/** Deliver every due row on its own platform's transport. Never throws:
 *  per-row and per-batch failures are counted and logged, not propagated. */
export async function deliverReminders(
  items: DueSend[],
  deps: SendDeps
): Promise<SendCounts> {
  const counts: SendCounts = {
    blocked: 0,
    failed: 0,
    pruned: 0,
    sent: 0,
    writeFailed: 0,
  };
  const expo: DueSend[] = [];
  // The push has gone out by now, so a failed stamp is not a failed send.
  const stamp = async (item: DueSend): Promise<void> => {
    counts.sent++;
    try {
      await deps.markSent(item.endpoint, item.today);
    } catch {
      counts.writeFailed++;
      console.error("send-reminders: could not stamp last_sent_date");
    }
  };
  const prune = async (item: DueSend): Promise<void> => {
    try {
      await deps.prune(item.endpoint);
      counts.pruned++;
    } catch {
      counts.writeFailed++;
      console.error("send-reminders: could not prune a dead subscription");
    }
  };

  for (const item of items) {
    const platform = item.platform ?? "web";
    if (platform === "expo") {
      expo.push(item);
      continue;
    }
    if (platform !== "web") {
      counts.failed++;
      console.error(
        `send-reminders: unknown platform "${platform}", skipping row`
      );
      continue;
    }
    if (!isAllowedPushEndpoint(item.endpoint)) {
      counts.blocked++;
      console.error("send-reminders: web endpoint is not a push service");
      continue;
    }
    try {
      await deps.sendWeb(item.endpoint, item.keys, item.payload);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prune(item);
      } else {
        counts.failed++;
        console.error(
          `send-reminders: push failed for ${webHost(item.endpoint)} (status ${status ?? "unknown"})`,
          error
        );
      }
      continue;
    }
    await stamp(item);
  }

  for (let i = 0; i < expo.length; i += EXPO_BATCH_SIZE) {
    const batch = expo.slice(i, i + EXPO_BATCH_SIZE);
    let tickets: ExpoTicket[];
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (deps.expoAccessToken) {
        headers.Authorization = `Bearer ${deps.expoAccessToken}`;
      }
      const res = await deps.fetch(EXPO_PUSH_URL, {
        body: JSON.stringify(
          batch.map((b) => expoMessage(b.endpoint, b.payload))
        ),
        headers,
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `expo push HTTP ${res.status}: ${redactTokens(text.slice(0, 500))}`
        );
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      tickets = Array.isArray(json?.data) ? json.data : [];
    } catch (error) {
      counts.failed += batch.length;
      console.error(
        `send-reminders: expo batch of ${batch.length} failed`,
        error
      );
      continue;
    }
    // Tickets come back in request order.
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const ticket = tickets[j];
      if (ticket?.status === "ok") {
        await stamp(item);
      } else if (ticket?.details?.error === "DeviceNotRegistered") {
        await prune(item);
      } else {
        counts.failed++;
        console.error(
          `send-reminders: expo push failed (${ticket?.details?.error ?? ticket?.status ?? "no ticket"})`,
          redactTokens(ticket?.message ?? "")
        );
      }
    }
  }
  return counts;
}

// Where the Quran data files are fetched from, server to server. Reminder links
// are relative paths, so this is never shown to anyone. It stays on the Vercel
// address, which answers whatever the custom domain's DNS is doing.
const DATA_ORIGIN = "https://mindfulverse.vercel.app";

// Browser-invoked (welcome path) as well as cron-invoked, so every response
// carries CORS headers.
const CORS = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { headers: JSON_HEADERS, status });

/** Never lets an internal error (or its message) reach the caller. */
export default async function handler(req: Request): Promise<Response> {
  try {
    return await handle(req);
  } catch (error) {
    console.error("send-reminders: unhandled error", error);
    return jsonResponse({ error: "internal error" }, 500);
  }
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS, status: 204 });
  }
  // Authenticate before loading the push library or touching its secrets.
  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`;

  let welcome: { endpoint: string; token: string } | null = null;
  if (!isCron) {
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const endpoint = await req
      .json()
      .then((b: { endpoint?: unknown }) => b?.endpoint)
      .catch(() => {});
    if (!token || typeof endpoint !== "string" || !endpoint) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    welcome = { endpoint, token };
  }

  const { createAdminClient, createClient } = await import("npm:@insforge/sdk");

  const userClient = welcome
    ? createClient({
        accessToken: welcome.token,
        baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
      })
    : null;
  let welcomeUserId = "";
  if (userClient) {
    const { data: userData } = await userClient.auth.getCurrentUser();
    if (!userData?.user?.id) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    welcomeUserId = userData.user.id;
  }

  const webpush = (await import("npm:web-push")).default;

  // oxlint-disable typescript/no-non-null-assertion -- deploy-time secrets; web-push validates them
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );
  // oxlint-enable typescript/no-non-null-assertion

  // Transport wiring for deliverReminders(); `db` is whichever client the
  // path runs as (admin for cron, the caller's RLS-scoped client for welcome).
  // deno-lint-ignore no-explicit-any
  // oxlint-disable-next-line typescript/no-explicit-any -- structural stand-in for the SDK query builder
  function sendDeps(db: { database: { from(table: string): any } }): SendDeps {
    return {
      expoAccessToken: Deno.env.get("EXPO_ACCESS_TOKEN") || undefined,
      fetch: (input, init) => fetch(input, init),
      markSent: async (endpoint, today) => {
        assertWritten(
          await db.database
            .from("push_subscriptions")
            .update({ last_sent_date: today })
            .eq("endpoint", endpoint),
          "stamp"
        );
      },
      prune: async (endpoint) => {
        assertWritten(
          await db.database
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", endpoint),
          "prune"
        );
      },
      sendWeb: async (endpoint, keys, payload) => {
        await webpush.sendNotification({ endpoint, keys } as never, payload);
      },
    };
  }

  const now = Date.now();
  const surahCache = new Map<number, Record<string, { translation: string }>>();
  async function verseText(verseKey: string): Promise<string> {
    const [surah, ayah] = verseKey.split(":").map(Number);
    let table = surahCache.get(surah);
    if (!table) {
      const res = await fetch(`${DATA_ORIGIN}/data/quran/${surah}.json`);
      if (!res.ok) {
        throw new Error(`quran fetch failed: surah ${surah} → ${res.status}`);
      }
      const ayahs: { ayah: number; translation: string }[] = await res.json();
      table = Object.fromEntries(ayahs.map((a) => [String(a.ayah), a]));
      surahCache.set(surah, table);
    }
    return table[String(ayah)]?.translation ?? "";
  }

  async function todaysPayload(
    timeZone: string,
    userId: string
  ): Promise<string> {
    const verseKey = verseKeyForDayIndex(
      localDayIndexInZone(now, timeZone),
      userId
    );
    const body = await verseText(verseKey);
    return JSON.stringify({
      body: body.length > 240 ? `${body.slice(0, 237)}…` : body,
      title: `Today's verse — Qur'an ${verseKey}`,
      url: "/checkin",
    });
  }

  interface SurahMeta {
    number: number;
    name: string;
    ayahCount: number;
  }
  let surahMetaPromise: Promise<SurahMeta[]> | null = null;
  function loadSurahMeta(): Promise<SurahMeta[]> {
    surahMetaPromise ??= fetch(`${DATA_ORIGIN}/data/surahs.json`).then(
      (res) => {
        if (!res.ok) {
          throw new Error(`surahs fetch failed: ${res.status}`);
        }
        return res.json();
      }
    );
    return surahMetaPromise;
  }

  /** Continue-tadabbur nudge when the user has a fresh unfinished surah,
   *  otherwise today's verse. Any lookup failure degrades to the verse. */
  async function reminderPayload(
    timeZone: string,
    userId: string,
    tadabbur: Record<string, TadabburEntry> | null | undefined
  ): Promise<string> {
    try {
      const meta = await loadSurahMeta();
      const counts = Object.fromEntries(
        meta.map((s) => [String(s.number), s.ayahCount])
      );
      const target = pickContinueTarget(tadabbur, counts, now);
      if (target) {
        const name =
          meta.find((s) => s.number === target.surah)?.name ??
          `Surah ${target.surah}`;
        return JSON.stringify({
          body: `You paused at verse ${target.nextAyah - 1}. ${name} is waiting where you left off.`,
          title: `Continue your tadabbur — ${name}`,
          url: `/tadabbur/${target.surah}?v=${target.nextAyah}`,
        });
      }
    } catch (error_) {
      console.error(
        "send-reminders: continue-target lookup failed, falling back to verse",
        error_
      );
    }
    return todaysPayload(timeZone, userId);
  }

  // --- Welcome path: a signed-in user just subscribed on a device and asks
  // for today's verse immediately, as live confirmation the pipeline works.
  // Stamping last_sent_date means the scheduled send skips today (no double).
  if (welcome && userClient) {
    // RLS scopes this to the caller's own rows — no one can target another
    // user's endpoint.
    const { data: sub, error } = await userClient.database
      .from("push_subscriptions")
      .select("endpoint, platform, keys, timezone")
      .eq("endpoint", welcome.endpoint)
      .maybeSingle();
    if (error || !sub) {
      return jsonResponse({ error: "subscription not found" }, 404);
    }
    // Same transports, endpoint allowlist and stamp as the cron. Only native
    // rows are pruned here, as before.
    const deps = sendDeps(userClient);
    let counts: SendCounts | null = null;
    try {
      counts = await deliverReminders(
        [
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
            payload: await todaysPayload(sub.timezone, welcomeUserId),
            platform: sub.platform,
            today: localDateInZone(now, sub.timezone),
          },
        ],
        sub.platform === "expo"
          ? deps
          : { ...deps, prune: () => Promise.resolve() }
      );
    } catch (error_) {
      console.error("send-reminders: welcome push failed", error_);
    }
    return counts?.sent === 1
      ? jsonResponse({ sent: 1, writeFailed: counts.writeFailed }, 200)
      : jsonResponse({ error: "push failed" }, 502);
  }

  // --- Cron path: the 15-minute schedule fanning out to everyone due.
  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    // Admin API key: reads every user's subscriptions (bypasses RLS).
    // oxlint-disable-next-line typescript/no-non-null-assertion -- deploy-time secret
    apiKey: Deno.env.get("API_KEY")!,
  });

  interface SubRow {
    endpoint: string;
    platform?: string | null;
    keys: unknown;
    reminder_time: string;
    timezone: string;
    last_sent_date: string | null;
    user_id: string;
  }
  // Stable order so pages neither overlap nor skip rows.
  const { rows: subs, error } = await fetchAllRows<SubRow>((from, to) =>
    admin.database
      .from("push_subscriptions")
      .select(
        "endpoint, platform, keys, reminder_time, timezone, last_sent_date, user_id"
      )
      .order("endpoint")
      .range(from, to)
  );
  if (error) {
    console.error("send-reminders: subscription read failed", error);
    return jsonResponse({ error: "internal error" }, 500);
  }
  console.log(`send-reminders: fetched ${subs.length} subscription rows`);

  let prepFailed = 0;
  let skipped = 0;
  const dueSubs: { sub: SubRow; today: string }[] = [];
  for (const sub of subs) {
    // Guarded per row: an invalid user-supplied IANA timezone throws
    // RangeError and must not abort the remaining subscriptions.
    try {
      const today = dueOccurrence(
        sub.reminder_time,
        now,
        sub.timezone,
        sub.last_sent_date
      );
      if (today === null) {
        skipped++;
      } else {
        dueSubs.push({ sub, today });
      }
    } catch (error_) {
      prepFailed++;
      console.error(
        `send-reminders: subscription processing failed for ${sub.timezone ?? "unknown-tz"}`,
        error_
      );
    }
  }

  // One progress query per chunk of due users, not one per user.
  const tadabburByUser = await loadTadabburByUser(
    dueSubs.map((d) => d.sub.user_id),
    (ids) =>
      admin.database
        .from("progress")
        .select("user_id, surah_tadabbur")
        .in("user_id", ids)
  );

  const due: DueSend[] = [];
  for (const { sub, today } of dueSubs) {
    // A verse-fetch failure for one row must not abort the rest.
    try {
      due.push({
        endpoint: sub.endpoint,
        keys: sub.keys,
        payload: await reminderPayload(
          sub.timezone,
          sub.user_id,
          tadabburByUser.get(sub.user_id)
        ),
        platform: sub.platform,
        today,
      });
    } catch (error_) {
      prepFailed++;
      console.error("send-reminders: payload build failed", error_);
    }
  }
  const {
    sent,
    pruned,
    failed: sendFailed,
    writeFailed,
    blocked,
  } = await deliverReminders(due, sendDeps(admin));
  const failed = prepFailed + sendFailed;
  return jsonResponse(
    { blocked, failed, pruned, sent, skipped, writeFailed },
    200
  );
}
