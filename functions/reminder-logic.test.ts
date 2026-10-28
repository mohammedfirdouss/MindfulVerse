import { describe, it, expect } from "vitest";

import { verseKeyFor as appVerseKeyFor } from "../packages/core/dailyVerse";
import {
  minutesOfDayInZone,
  localDayIndexInZone,
  verseKeyForDayIndex,
  isDue,
  localDateInZone,
  pickContinueTarget,
} from "./send-reminders";

// 2026-09-15T12:00:00Z fixed instant
const T = Date.UTC(2026, 8, 15, 12, 0, 0);

describe("timezone math", () => {
  it("minutes of day respects the zone", () => {
    expect(minutesOfDayInZone(T, "UTC")).toBe(12 * 60);
    expect(minutesOfDayInZone(T, "Africa/Lagos")).toBe(13 * 60); // UTC+1
    expect(minutesOfDayInZone(T, "America/New_York")).toBe(8 * 60); // EDT, UTC-4
  });

  it("local date string respects the zone", () => {
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "Africa/Lagos")).toBe(
      "2026-09-16"
    );
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "UTC")).toBe(
      "2026-09-15"
    );
  });

  it("day index matches the client formula (floor of local-midnight epoch / 86.4M)", () => {
    // Client: new Date(y,m,d).getTime()/86_400_000 floored, in the user's zone.
    // For Lagos (UTC+1), local midnight of 2026-09-15 is 2026-09-14T23:00Z.
    const lagosMidnightUtc = Date.UTC(2026, 8, 14, 23, 0, 0);
    expect(localDayIndexInZone(T, "Africa/Lagos")).toBe(
      Math.floor(lagosMidnightUtc / 86_400_000)
    );
    // For New York (UTC-4), local midnight is 2026-09-15T04:00Z.
    const nyMidnightUtc = Date.UTC(2026, 8, 15, 4, 0, 0);
    expect(localDayIndexInZone(T, "America/New_York")).toBe(
      Math.floor(nyMidnightUtc / 86_400_000)
    );
  });

  it("samples the offset at local midnight, not at `now`, across a DST transition", () => {
    // Europe/London springs forward 2026-03-29 (GMT -> BST) and falls back
    // 2026-10-25 (BST -> GMT). Sampling the offset at `now` instead of at
    // local midnight would shift these by one day.
    expect(
      localDayIndexInZone(Date.UTC(2026, 2, 29, 12, 0, 0), "Europe/London")
    ).toBe(20_541);
    expect(
      localDayIndexInZone(Date.UTC(2026, 9, 25, 12, 0, 0), "Europe/London")
    ).toBe(20_750);
  });
});

describe("verse rotation", () => {
  it("stride-53 walk over a 139-verse pool, matching packages/core/dailyVerse.ts", () => {
    const id = "4b0c2f4e-0000-4000-8000-000000000001";
    expect(verseKeyForDayIndex(0, id)).toBe(appVerseKeyFor(0, id)); // same verse as the app
    expect(verseKeyForDayIndex(20_000, id)).toBe(appVerseKeyFor(20_000, id));
    expect(verseKeyForDayIndex(139, id)).toBe(verseKeyForDayIndex(0, id)); // full cycle
    expect(verseKeyForDayIndex(5, "someone-else")).not.toBe(
      verseKeyForDayIndex(5, id)
    );
  });
});

describe(isDue, () => {
  it("fires within the 15-minute window after the reminder time", () => {
    expect(isDue("07:00", 7 * 60)).toBeTruthy();
    expect(isDue("07:00", 7 * 60 + 14)).toBeTruthy();
    expect(isDue("07:00", 7 * 60 + 15)).toBeFalsy();
    expect(isDue("07:00", 7 * 60 - 1)).toBeFalsy();
  });

  it("handles the midnight wrap", () => {
    expect(isDue("00:05", 23 * 60 + 59)).toBeFalsy();
    expect(isDue("23:55", 23 * 60 + 56)).toBeTruthy();
    expect(isDue("00:05", 6)).toBeTruthy();
  });
});

describe(pickContinueTarget, () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 8, 17, 12, 0, 0);
  const counts = { "2": 286, "49": 18, "8": 75 };

  it("picks the most recently pondered unfinished surah, resuming at the next ayah", () => {
    const map = {
      "2": { ayah: 10, updatedAt: now - 5 * DAY },
      "8": { ayah: 3, updatedAt: now - 2 * DAY },
    };
    expect(pickContinueTarget(map, counts, now)).toStrictEqual({
      nextAyah: 4,
      surah: 8,
    });
  });

  it("skips surahs already pondered to the last ayah", () => {
    const map = {
      "2": { ayah: 40, updatedAt: now - 6 * DAY },
      "49": { ayah: 18, updatedAt: now - 1 * DAY }, // finished,
    };
    expect(pickContinueTarget(map, counts, now)).toStrictEqual({
      nextAyah: 41,
      surah: 2,
    });
  });

  it("ignores entries older than the freshness window", () => {
    const map = { "2": { ayah: 10, updatedAt: now - 20 * DAY } };
    expect(pickContinueTarget(map, counts, now)).toBeNull();
  });

  it("returns null for empty, null, or malformed maps", () => {
    expect(pickContinueTarget({}, counts, now)).toBeNull();
    expect(pickContinueTarget(null, counts, now)).toBeNull();
    expect(pickContinueTarget(undefined, counts, now)).toBeNull();
    expect(
      pickContinueTarget(
        { "2": { ayah: Number.NaN, updatedAt: now } } as never,
        counts,
        now
      )
    ).toBeNull();
  });

  it("skips surahs with an unknown ayah count", () => {
    const map = { "999": { ayah: 3, updatedAt: now - 1 * DAY } };
    expect(pickContinueTarget(map, counts, now)).toBeNull();
  });
});

describe("verse pool parity with the client", () => {
  it("is deep-equal to the pool in packages/core/dailyVerse.ts", async () => {
    const fn = await import("./send-reminders");
    const client = await import("../packages/core/dailyVerse");
    expect(fn.DAILY_VERSES).toStrictEqual(client.DAILY_VERSES);
  });
});
