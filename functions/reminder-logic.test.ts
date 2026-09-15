import { describe, it, expect } from "vitest";
import {
  minutesOfDayInZone, localDayIndexInZone, verseKeyForDayIndex, isDue, localDateInZone,
} from "./send-reminders";

// 2026-09-15T12:00:00Z fixed instant
const T = Date.UTC(2026, 8, 15, 12, 0, 0);

describe("timezone math", () => {
  it("minutes of day respects the zone", () => {
    expect(minutesOfDayInZone(T, "UTC")).toBe(12 * 60);
    expect(minutesOfDayInZone(T, "Africa/Lagos")).toBe(13 * 60);        // UTC+1
    expect(minutesOfDayInZone(T, "America/New_York")).toBe(8 * 60);    // EDT, UTC-4
  });
  it("local date string respects the zone", () => {
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "Africa/Lagos")).toBe("2026-09-16");
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "UTC")).toBe("2026-09-15");
  });
  it("day index matches the client formula (floor of local-midnight epoch / 86.4M)", () => {
    // Client: new Date(y,m,d).getTime()/86_400_000 floored, in the user's zone.
    // For Lagos (UTC+1), local midnight of 2026-09-15 is 2026-09-14T23:00Z.
    const lagosMidnightUtc = Date.UTC(2026, 8, 14, 23, 0, 0);
    expect(localDayIndexInZone(T, "Africa/Lagos")).toBe(Math.floor(lagosMidnightUtc / 86_400_000));
    // For New York (UTC-4), local midnight is 2026-09-15T04:00Z.
    const nyMidnightUtc = Date.UTC(2026, 8, 15, 4, 0, 0);
    expect(localDayIndexInZone(T, "America/New_York")).toBe(Math.floor(nyMidnightUtc / 86_400_000));
  });
  it("samples the offset at local midnight, not at `now`, across a DST transition", () => {
    // Europe/London springs forward 2026-03-29 (GMT -> BST) and falls back
    // 2026-10-25 (BST -> GMT). Sampling the offset at `now` instead of at
    // local midnight would shift these by one day.
    expect(localDayIndexInZone(Date.UTC(2026, 2, 29, 12, 0, 0), "Europe/London")).toBe(20541);
    expect(localDayIndexInZone(Date.UTC(2026, 9, 25, 12, 0, 0), "Europe/London")).toBe(20750);
  });
});

describe("verse rotation", () => {
  it("stride-53 walk over a 139-verse pool, matching src/lib/dailyVerse.ts", () => {
    expect(verseKeyForDayIndex(0)).toBe("94:5");    // index 0
    expect(verseKeyForDayIndex(1)).toBe("3:31");    // (1*53)%139 = 53
    expect(verseKeyForDayIndex(139)).toBe(verseKeyForDayIndex(0)); // full cycle
  });
});

describe("isDue", () => {
  it("fires within the 15-minute window after the reminder time", () => {
    expect(isDue("07:00", 7 * 60)).toBe(true);
    expect(isDue("07:00", 7 * 60 + 14)).toBe(true);
    expect(isDue("07:00", 7 * 60 + 15)).toBe(false);
    expect(isDue("07:00", 7 * 60 - 1)).toBe(false);
  });
  it("handles the midnight wrap", () => {
    expect(isDue("00:05", 23 * 60 + 59)).toBe(false);
    expect(isDue("23:55", 23 * 60 + 56)).toBe(true);
    expect(isDue("00:05", 6)).toBe(true);
  });
});
