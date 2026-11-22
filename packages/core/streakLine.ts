// The returning line at the top of Home, on web and Android. A run of days
// counts up from day 2. After a break there is no count and no "streak
// lost": just a welcome back for that day, and the count starts again
// quietly the next day.

/** A gap of this many days or more since the last visit means a break. */
const BREAK_DAYS = 2;

export const WELCOME_BACK_LINE = "Welcome back to the Qur’an";

export function streakLine(streak: number, daysAway = 0): string | null {
  if (streak >= 2) {
    return `Day ${streak} of returning to the Qur’an`;
  }
  return daysAway >= BREAK_DAYS ? WELCOME_BACK_LINE : null;
}
