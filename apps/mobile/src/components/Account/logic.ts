// Pure helpers for the Account screen: form validation and reminder-time
// arithmetic. No react-native imports, so root vitest can run them.

/** Shown when a call throws instead of returning an error (offline, DNS…).
 *  Same wording as web's Account.tsx. */
export const NETWORK_ERROR = "Couldn't reach the server — check your connection and try again.";

/** Web's <input type="time" step={900}>: the reminder moves in 15-minute steps. */
export const TIME_STEP_MINUTES = 15;
export const DEFAULT_REMINDER_TIME = "07:00";

// Deliberately loose: the server is the authority. This only catches the
// mistakes the browser's type="email" would have caught on web.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a user-facing message for an obviously incomplete form, or null.
 *  Mirrors web's `required` / `type="email"` attributes. */
export function validateCredentials(email: string, password: string): string | null {
  const e = email.trim();
  if (!e) return "Enter your email.";
  if (!EMAIL_RE.test(e)) return "That email doesn't look right — check it and try again.";
  if (!password) return "Enter your password.";
  return null;
}

/** Keeps digits only, at most 6 (pasted codes often carry spaces). */
export function normalizeOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

/** Mirrors web's pattern="[0-9]{6}". */
export function validateOtp(otp: string): string | null {
  return /^\d{6}$/.test(otp) ? null : "Enter the 6-digit code from the email.";
}

/** "HH:MM" (24h) → minutes after midnight, or null when malformed. */
export function parseTime(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes after midnight (any integer, wrapped into one day) → "HH:MM". */
export function toTime(minutes: number): string {
  const day = 24 * 60;
  const m = ((Math.round(minutes) % day) + day) % day;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Moves `time` by `delta` minutes, wrapping past midnight. A one-step move
 *  (±15) on a time off the 15-minute grid (e.g. one typed on web) lands on
 *  the next grid slot in that direction, so a tap never skips a slot; larger
 *  moves (±60) keep the minutes. Malformed input falls back to the default. */
export function shiftTime(time: string, delta: number): string {
  const base = parseTime(time);
  if (base === null) return DEFAULT_REMINDER_TIME;
  const step = TIME_STEP_MINUTES;
  const off = base % step;
  if (off !== 0 && Math.abs(delta) === step) {
    return toTime(delta > 0 ? base - off + step : base - off);
  }
  return toTime(base + delta);
}

/** "HH:MM" → "7:00 AM" for display (the stored value stays 24h). */
export function formatTime(time: string): string {
  const m = parseTime(time);
  if (m === null) return time;
  const h = Math.floor(m / 60);
  const min = String(m % 60).padStart(2, "0");
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}

/** Spoken form for screen readers: "7:00 AM" reads well as-is, but a bare
 *  "12:00 PM" is clearer as "noon" and "12:00 AM" as "midnight". */
export function spokenTime(time: string): string {
  const m = parseTime(time);
  if (m === 0) return "midnight";
  if (m === 12 * 60) return "noon";
  return formatTime(time);
}

/** Notifications permission as expo-notifications reports it. */
export interface PermissionInfo {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
}

/** Blocked = the OS will no longer show the prompt; only Settings can fix it.
 *  (A first refusal on Android 13+ still allows one more prompt.) */
export function notificationsBlocked(p: PermissionInfo | null): boolean {
  return !!p && p.status === "denied" && !p.canAskAgain;
}

const FEEDBACK_EMAIL = "mohammedfirdous682@gmail.com";
const FEEDBACK_GREETING = "Salaam alaykum warahmatullah wabarakatuh!\n\n";

/** Same mailto as web's FeedbackLink. */
export function feedbackMailto(subject = "Feedback on MindfulVerse"): string {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(FEEDBACK_GREETING)}`;
}
export { FEEDBACK_EMAIL };
