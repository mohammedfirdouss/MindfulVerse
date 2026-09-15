import { describe, it, expect, vi } from "vitest";
import { makeDebounced } from "./sync";

describe("makeDebounced", () => {
  it("coalesces bursts into one trailing call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const run = makeDebounced(fn, 3000);
    run(); run(); run();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
