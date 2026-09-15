// Edge function (Deno Subhosting): sends the daily-verse Web Push reminder.
// Fired every 15 minutes by an InsForge schedule. Pure helpers are exported
// and unit-tested with vitest; Deno-only modules are imported dynamically
// inside the handler so this file stays importable from Node test runners.

declare const Deno: { env: { get(k: string): string | undefined } };

// Same pool + stride as src/lib/dailyVerse.ts — keep the two in sync.
const DAILY_VERSES: string[] = [
  "94:5", "94:6", "94:1", "94:2", "94:3", "94:4", "94:7", "94:8", "93:1", "93:2",
  "93:3", "93:4", "93:5", "93:7", "93:11", "3:139", "39:53", "12:87", "10:57", "10:58",
  "10:62", "10:64", "16:96", "16:97", "2:25", "18:107", "19:96", "85:11", "39:17", "39:18",
  "41:30", "41:31", "46:13", "2:268", "11:115", "25:75", "76:12", "13:28", "2:186", "50:16",
  "20:46", "33:3", "9:51", "26:62", "3:174", "8:2", "2:255", "24:35", "2:286", "42:25",
  "11:90", "85:14", "57:28", "3:31", "6:54", "4:110", "23:118", "21:83", "28:16", "110:3",
  "3:159", "39:66", "29:69", "2:45", "2:153", "2:156", "2:157", "3:200", "103:3", "90:17",
  "41:35", "32:24", "16:127", "16:128", "40:55", "50:39", "31:22", "73:8", "2:201", "3:8",
  "25:74", "14:40", "17:80", "20:25", "20:26", "28:24", "112:1", "112:2", "112:3", "112:4",
  "113:1", "114:1", "33:41", "33:42", "33:43", "7:205", "76:25", "3:191", "29:60", "11:6",
  "17:30", "34:39", "42:19", "51:58", "67:15", "39:52", "28:73", "16:53", "55:13", "30:21",
  "30:22", "16:65", "16:66", "16:68", "16:69", "36:33", "36:34", "36:36", "55:5", "55:6",
  "55:10", "67:19", "88:17", "88:18", "88:19", "88:20", "51:47", "51:49", "78:6", "78:7",
  "78:8", "78:9", "78:10", "78:11", "2:152", "16:18", "27:19", "108:1", "108:2",
];

interface ZoneParts { year: number; month: number; day: number; hour: number; minute: number }

function partsInZone(utcMs: number, timeZone: string): ZoneParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}

export function minutesOfDayInZone(utcMs: number, timeZone: string): number {
  const { hour, minute } = partsInZone(utcMs, timeZone);
  return hour * 60 + minute;
}

export function localDateInZone(utcMs: number, timeZone: string): string {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Replicates the client: floor(epoch-of-local-midnight / 86_400_000).
 *  Samples the zone offset AT local midnight (not at `utcMs`) so DST-transition
 *  days — where the offset at "now" can differ from the offset at 00:00 local —
 *  still resolve to the correct day index. */
export function localDayIndexInZone(utcMs: number, timeZone: string): number {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  // Guess: local midnight is numerically this UTC instant, then correct by the
  // zone's actual offset at that guessed instant (wall-clock reinterpreted as
  // UTC, minus the guess itself).
  const guessUtc = Date.UTC(year, month - 1, day);
  const p = partsInZone(guessUtc, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const offsetMs = wallAsUtc - guessUtc;
  const localMidnightUtc = guessUtc - offsetMs;
  return Math.floor(localMidnightUtc / 86_400_000);
}

export function verseKeyForDayIndex(dayIndex: number): string {
  const n = DAILY_VERSES.length;
  return DAILY_VERSES[((dayIndex * 53) % n + n) % n];
}

/** Due when reminderTime ('HH:MM') falls in [now, now+15min), wrapping midnight. */
export function isDue(reminderTime: string, nowMinutes: number, windowMinutes = 15): boolean {
  const [h, m] = reminderTime.split(":").map(Number);
  const reminder = h * 60 + m;
  return ((nowMinutes - reminder + 1440) % 1440) < windowMinutes;
}

const SITE_URL = "https://mindfulverse.vercel.app";

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const { createAdminClient } = await import("npm:@insforge/sdk");
  const webpush = (await import("npm:web-push")).default;

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    // Admin API key: reads every user's subscriptions (bypasses RLS).
    apiKey: Deno.env.get("API_KEY")!,
  });

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = Date.now();
  const { data: subs, error } = await admin.database
    .from("push_subscriptions")
    .select("endpoint, keys, reminder_time, timezone, last_sent_date")
    .limit(1000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const surahCache = new Map<number, Record<string, { translation: string }>>();
  async function verseText(verseKey: string): Promise<string> {
    const [surah, ayah] = verseKey.split(":").map(Number);
    if (!surahCache.has(surah)) {
      const res = await fetch(`${SITE_URL}/data/quran/${surah}.json`);
      if (!res.ok) throw new Error(`quran fetch failed: surah ${surah} → ${res.status}`);
      const ayahs: Array<{ ayah: number; translation: string }> = await res.json();
      surahCache.set(surah, Object.fromEntries(ayahs.map((a) => [String(a.ayah), a])));
    }
    return surahCache.get(surah)![String(ayah)]?.translation ?? "";
  }

  let sent = 0, pruned = 0, skipped = 0, failed = 0;
  for (const sub of subs ?? []) {
    // Whole per-subscription body is guarded: an invalid user-supplied IANA
    // timezone (minutesOfDayInZone/localDayIndexInZone throw RangeError) or a
    // verse-fetch failure must not abort the remaining subscriptions.
    try {
      const nowMin = minutesOfDayInZone(now, sub.timezone);
      const today = localDateInZone(now, sub.timezone);
      if (!isDue(sub.reminder_time, nowMin) || sub.last_sent_date === today) { skipped++; continue; }
      const verseKey = verseKeyForDayIndex(localDayIndexInZone(now, sub.timezone));
      const body = await verseText(verseKey);
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({
            title: `Today's verse — Qur'an ${verseKey}`,
            body: body.length > 240 ? `${body.slice(0, 237)}…` : body,
            url: "/checkin",
          }),
        );
        await admin.database.from("push_subscriptions")
          .update({ last_sent_date: today }).eq("endpoint", sub.endpoint);
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          pruned++;
        } else {
          failed++;
          const host = (() => { try { return new URL(sub.endpoint).host; } catch { return "invalid-endpoint"; } })();
          console.error(`send-reminders: push failed for ${host} (status ${status ?? "unknown"})`, err);
        }
      }
    } catch (err) {
      failed++;
      console.error(`send-reminders: subscription processing failed for ${sub.timezone ?? "unknown-tz"}`, err);
    }
  }
  return new Response(JSON.stringify({ sent, pruned, skipped, failed }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
