import { describe, expect, it } from "vitest";

import { keepNote, openingStage } from "./flow";

describe(openingStage, () => {
  it("asks about the heart on a fresh day", () => {
    expect(openingStage(false, "")).toBe("feel");
    expect(openingStage(false, "   ")).toBe("feel");
  });

  it("opens on the verse once checked in today", () => {
    expect(openingStage(true, "")).toBe("verse");
  });

  it("opens on the verse when a draft is waiting", () => {
    expect(openingStage(false, "half a thought")).toBe("verse");
  });
});

describe(keepNote, () => {
  it("is silent with nothing written and nothing kept", () => {
    expect(keepNote("", false)).toBeNull();
  });

  it("notes the draft once there is text", () => {
    expect(keepNote("a line", false)).toBe("draft");
    expect(keepNote("a new line", true)).toBe("draft");
  });

  it("confirms the keep once the draft has cleared", () => {
    expect(keepNote("", true)).toBe("kept");
  });
});
