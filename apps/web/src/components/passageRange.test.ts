import { describe, expect, it } from "vitest";

import { passageRange } from "./PassageMap";

describe(passageRange, () => {
  it("names one verse or a span of verses", () => {
    expect(passageRange({ from: 7, theme: "", to: 7 })).toBe("Verse 7");
    expect(passageRange({ from: 7, theme: "", to: 12 })).toBe("Verses 7 to 12");
  });
});
