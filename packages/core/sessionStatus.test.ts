import { describe, expect, it } from "vitest";

import { sessionStatusText } from "./sessionStatus";

describe(sessionStatusText, () => {
  it("shows the step you're on, counting from 1", () => {
    expect(sessionStatusText("progress", 0, 3)).toBe("Step 1 of 3");
    expect(sessionStatusText("progress", 1, 3)).toBe("Step 2 of 3");
  });

  it("never shows a step past the last one", () => {
    expect(sessionStatusText("progress", 7, 3)).toBe("Step 3 of 3");
    expect(sessionStatusText("progress", null, 2)).toBe("Step 1 of 2");
  });

  it("says Done when finished, and the length before you begin", () => {
    expect(sessionStatusText("done", 2, 3)).toBe("Done");
    expect(sessionStatusText("new", null, 3)).toBe("3 steps");
    expect(sessionStatusText("new", null, 1)).toBe("1 step");
  });
});
