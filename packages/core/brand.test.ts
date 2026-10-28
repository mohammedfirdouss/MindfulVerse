import { describe, expect, it } from "vitest";

import { MARK_RECTS, markBounds, markPath, markSvg } from "./brand";

describe("brand mark", () => {
  it("keeps the two pieces of تدبر apart (د and ر never join forward)", () => {
    // تد sits at x >= 7, بر at x <= 6: no square bridges the gap between them.
    const bridges = MARK_RECTS.filter(([x, , w]) => x <= 6 && x + w > 7);
    expect(bridges).toStrictEqual([]);
  });

  it("has the dots that tell ت from ب: two above, one below", () => {
    const dots = MARK_RECTS.filter(
      ([, , w, h]) => w === 1 && h === 1 && w * h === 1
    );
    const above = dots.filter(([, y]) => y < 7);
    const below = dots.filter(([x, y]) => y > 11 && x > 3);
    expect(above).toHaveLength(2);
    expect(below).toHaveLength(1);
  });

  it("builds a square, centred SVG", () => {
    const s = markSvg({ ground: "#2a3a8c", ink: "#fff", size: 64 });
    expect(s).toMatch(/^<svg [^>]*width="64" height="64"/);
    const [, , w, h] = s
      .match(/viewBox="([^"]+)"/)![1]
      .split(" ")
      .map(Number);
    expect(w).toBe(h);
    expect(s).toContain(markPath());
  });

  it("bounds cover the whole construction", () => {
    expect(markBounds()).toStrictEqual({ height: 9, minX: 1, minY: 5, width: 14 });
  });
});
