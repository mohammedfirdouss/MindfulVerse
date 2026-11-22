import { describe, expect, it } from "vitest";

import { daysAwayBefore } from "./progress";
import { streakLine, WELCOME_BACK_LINE } from "./streakLine";

describe(streakLine, () => {
  it("counts a run of days from day 2", () => {
    expect(streakLine(2)).toBe("Day 2 of returning to the Qur’an");
    expect(streakLine(9, 0)).toBe("Day 9 of returning to the Qur’an");
  });

  it("says nothing on a first visit or the day after a visit", () => {
    expect(streakLine(0)).toBeNull();
    expect(streakLine(1, 0)).toBeNull();
    expect(streakLine(1, 1)).toBeNull();
  });

  it("welcomes someone back after a break, without counting the gap", () => {
    expect(streakLine(1, 2)).toBe(WELCOME_BACK_LINE);
    expect(streakLine(1, 40)).toBe(WELCOME_BACK_LINE);
    expect(WELCOME_BACK_LINE).not.toMatch(/\d|miss|lost|broke/iu);
  });
});

describe(daysAwayBefore, () => {
  it("counts whole days back to the latest earlier visit", () => {
    expect(daysAwayBefore([], "2026-11-22")).toBe(0);
    expect(daysAwayBefore(["2026-11-22"], "2026-11-22")).toBe(0);
    expect(daysAwayBefore(["2026-11-21", "2026-11-22"], "2026-11-22")).toBe(1);
    expect(
      daysAwayBefore(["2026-11-01", "2026-11-18", "2026-11-22"], "2026-11-22")
    ).toBe(4);
  });

  it("crosses month and year ends, and a clock change", () => {
    expect(daysAwayBefore(["2025-12-30"], "2026-01-02")).toBe(3);
    expect(daysAwayBefore(["2026-03-28"], "2026-03-30")).toBe(2);
  });
});
