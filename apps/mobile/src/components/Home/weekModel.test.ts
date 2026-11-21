import type { JournalEntry } from "@mindfulverse/core/types";
import { describe, expect, it } from "vitest";

import { circleCountText, rhythmView } from "./weekModel";

function entryAt(date: Date): JournalEntry {
  return {
    body: "b",
    createdAt: date.getTime(),
    id: String(date.getTime()),
    prompt: "p",
  };
}

const now = new Date(2026, 10, 8, 9, 0);

describe(rhythmView, () => {
  it("shows nothing for a quiet week", () => {
    expect(rhythmView([], now)).toBeNull();
    expect(rhythmView([entryAt(new Date(2026, 9, 1))], now)).toBeNull();
  });

  it("says one day in the singular", () => {
    expect(rhythmView([entryAt(new Date(2026, 10, 8, 8))], now)).toStrictEqual({
      line: "You kept reflections on 1 day this week.",
    });
  });

  it("counts days, not entries", () => {
    const view = rhythmView(
      [
        entryAt(new Date(2026, 10, 2, 12)),
        entryAt(new Date(2026, 10, 5, 7)),
        entryAt(new Date(2026, 10, 5, 21)),
        entryAt(new Date(2026, 10, 8, 8)),
      ],
      now
    );
    expect(view?.line).toBe("You kept reflections on 3 days this week.");
  });
});

describe(circleCountText, () => {
  const circle = { name: "Friday group" };

  it("shows nothing without a circle or a count", () => {
    expect(circleCountText(null, 5, 5)).toBeNull();
    expect(circleCountText(circle, null, null)).toBeNull();
  });

  it("never singles out one person", () => {
    expect(circleCountText(circle, 1, 0)).toBeNull();
    expect(circleCountText(circle, null, 1)).toBeNull();
  });

  it("names the circle, not the people", () => {
    expect(circleCountText(circle, null, 2)).toBe(
      "2 in Friday group reflected this week."
    );
    expect(circleCountText(circle, 5, 3)).toBe(
      "5 in Friday group, 3 reflected this week."
    );
    expect(circleCountText(circle, 5, 1, false)).toBe(
      "5 people in this circle."
    );
  });
});
