import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLastReadScheduler, LAST_READ_DEBOUNCE_MS, topmostAyah, topmostRow } from "./lastRead";

const v = (...ns: number[]) => ns.map((n) => ({ first: n, last: n }));

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

describe("topmostRow", () => {
  it("picks the row with the lowest first ayah", () => {
    expect(topmostRow([{ first: 9, last: 12 }, { first: 5, last: 8 }])).toEqual({ first: 5, last: 8 });
    expect(topmostRow([])).toBeNull();
  });
});

describe("createLastReadScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("records the topmost verse once scrolling pauses", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update(v(3, 4, 5));
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS - 1);
    expect(record).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(record).toHaveBeenCalledWith(3);
  });

  it("debounces: only the final position of a fling is written", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update(v(1, 2));
    vi.advanceTimersByTime(300);
    s.update(v(40, 41));
    vi.advanceTimersByTime(300);
    s.update(v(90, 91));
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(90);
  });

  it("does not rewrite the same verse after settling on it again", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update(v(8));
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    s.update(v(8, 9));
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("skips a verse already recorded elsewhere (deep link)", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.noteRecorded(255);
    s.update(v(255, 256));
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).not.toHaveBeenCalled();
  });

  it("keeps a mid-paragraph verse when its paragraph settles on top (Reading view)", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.noteRecorded(255);
    s.update([{ first: 253, last: 256 }, { first: 257, last: 260 }]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).not.toHaveBeenCalled();
    s.update([{ first: 257, last: 260 }]);
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS);
    expect(record).toHaveBeenCalledWith(257);
  });

  it("cancel drops a pending write; an empty report writes nothing", () => {
    const record = vi.fn();
    const s = createLastReadScheduler(record);
    s.update(v(5));
    s.cancel();
    s.update(v());
    vi.advanceTimersByTime(LAST_READ_DEBOUNCE_MS * 2);
    expect(record).not.toHaveBeenCalled();
  });
});
