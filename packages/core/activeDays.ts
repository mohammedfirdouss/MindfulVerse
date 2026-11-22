// Anonymous "active today" signal: a random install id, the local day, the
// platform and the joined circle's code (if any), sent once per local day to
// the InsForge `active_days` table.
// Nothing else leaves the device. Never throws and never blocks startup.
import { getJoinedCircle } from "./circles";
import { getInstallId, localDay } from "./installId";
import { insforge } from "./sync/insforge";

export { getInstallId, localDay } from "./installId";

export type ActivePlatform = "web" | "android" | "ios";

export interface ActiveDayRow {
  install_id: string;
  day: string;
  platform: ActivePlatform;
  circle_code: string | null;
}

/** Resolves to the insert error, or null on success. */
export type SendActiveDay = (row: ActiveDayRow) => Promise<unknown>;

const LAST_DAY_KEY = "mindfulverse.activeDay.v1";

function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string | number; statusCode?: number } | null;
  const code = String(e?.code ?? "");
  return code === "23505" || code === "409" || e?.statusCode === 409;
}

const sendToInsforge: SendActiveDay = async (row) => {
  const { error } = await insforge.database.from("active_days").insert([row]);
  return error;
};

let inFlight = false;

/** Sends today's row unless this install already sent it. Resolves to
 *  whether a row was attempted; never rejects. */
export async function recordActiveDay(
  platform: ActivePlatform,
  now: Date = new Date(),
  send: SendActiveDay = sendToInsforge
): Promise<boolean> {
  if (inFlight) {
    return false;
  }
  inFlight = true;
  try {
    const day = localDay(now);
    if (localStorage.getItem(LAST_DAY_KEY) === day) {
      return false;
    }
    const error = await send({
      circle_code: getJoinedCircle()?.code ?? null,
      day,
      install_id: getInstallId(),
      platform,
    });
    if (!error || isDuplicate(error)) {
      localStorage.setItem(LAST_DAY_KEY, day);
    }
    return true;
  } catch {
    return false;
  } finally {
    inFlight = false;
  }
}

// The launch test counts real people, so only the live site sends the signal:
// not a dev server, a Vercel preview, or a browser driven by a test tool
// (Playwright, Lighthouse and the like set navigator.webdriver). Before this,
// test runs showed up as dozens of "new installs" a day.
export const LIVE_HOSTS: readonly string[] = [
  "mindfulverse.vercel.app",
  "mindfulverse.app",
  "www.mindfulverse.app",
];

/** Whether a web page load should count toward the launch test. */
export function isCountedWebVisit(
  hostname: string,
  webdriver: boolean
): boolean {
  return !webdriver && LIVE_HOSTS.includes(hostname.toLowerCase());
}

/** Fire and forget, for app startup. */
export function pingActiveDay(platform: ActivePlatform): void {
  void recordActiveDay(platform);
}
