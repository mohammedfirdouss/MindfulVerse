import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLastReadScheduler, LAST_READ_DEBOUNCE_MS, topmostAyah } from "./lastRead";

describe("topmostAyah", () => {
  it("picks the lowest visible ayah regardless of report order", () => {
    expect(topmostAyah([12, 10, 11])).toBe(10);
  });
  it("is null when nothing is visible", () => {
    expect(topmostAyah([])).toBeNull();
  });
  it("ignores junk values", () => {
    expect(topmostAyah([Number.NaN, 0, 7])).toBe(7);
  });
});

describe("createLastReadScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("records the topmost verse once scrolling pauses", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update([3, 4, 5]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS - 1);
    expect(record).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(record).toHaveBeenCalledWith(3);
  });

  it("debounces: only the final position of a fling is written", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update([1, 2]);
    vi.advanceTimersByTime(300);
    s.update([40, 41]);
    vi.advanceTimersByTime(300);
    s.update([90, 91]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(90);
  });

  it("does not rewrite the same verse after settling on it again", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update([8]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    s.update([8, 9]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("skips a verse already recorded elsewhere (deep link)", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.noteRecorded(255);
    s.update([255, 256]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).not.toHaveBeenCalled();
  });

  it("cancel drops a pending write; an empty report writes nothing", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update([5]);
    s.cancel();
    s.update([]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS * 2);
    expect(record).not.toHaveBeenCalled();
  });
});
