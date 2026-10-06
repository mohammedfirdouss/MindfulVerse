// Pure "last read" decision for the native reader — the FlatList counterpart
// of web's useLastReadTracker (apps/web/src/lib/useLastReadTracker.ts).
//
// Web: an IntersectionObserver over every verse; after 800 ms of quiet, the
// topmost visible verse becomes last-read. Native: FlatList's
// onViewableItemsChanged reports the visible rows; each row covers a run of
// ayahs (one in Translation view, a paragraph in Reading view). Same debounce,
// same "topmost wins" rule; the topmost row's first ayah is recorded, unless
// the last recorded verse already lies inside that row (a jump to 2:255 lands
// mid-paragraph in Reading view and must not slide back to 2:253).

export interface RowRange {
  first: number;
  last: number;
}

/** The topmost visible row (lowest first ayah), or null. */
export function topmostRow(rows: Iterable<RowRange>): RowRange | null {
  let best: RowRange | null = null;
  for (const r of rows) {
    if (!Number.isFinite(r.first) || r.first < 1) continue;
    if (best === null || r.first < best.first) best = r;
  }
  return best;
}

export const LAST_READ_DEBOUNCE_MS = 800;

/** The topmost (lowest-numbered) ayah among the visible rows, or null. */
export function topmostAyah(visible: Iterable<number>): number | null {
  let best: number | null = null;
  for (const n of visible) {
    if (!Number.isFinite(n) || n < 1) continue;
    if (best === null || n < best) best = n;
  }
  return best;
}

export interface Timers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Debounces viewability reports into one record() call per pause in
 *  scrolling. `update` takes the visible rows' ayah ranges; `cancel` drops a
 *  pending write (unmount). */
export function createLastReadScheduler(
  record: (ayah: number) => void,
  delayMs: number = LAST_READ_DEBOUNCE_MS,
  timers: Timers = realTimers,
) {
  let handle: unknown;
  let pending = false;
  let last: number | null = null;

  function cancel() {
    if (pending) timers.clear(handle);
    pending = false;
  }

  function update(visible: Iterable<RowRange>) {
    cancel();
    const top = topmostRow(visible);
    if (top === null) return;
    pending = true;
    handle = timers.set(() => {
      pending = false;
      // Still on the verse already recorded (or the paragraph holding it).
      if (last !== null && last >= top.first && last <= top.last) return;
      last = top.first;
      record(top.first);
    }, delayMs);
  }

  /** Tell the scheduler about a write made elsewhere (deep link, jump), so a
   *  later settle on the same verse doesn't write it again. */
  function noteRecorded(ayah: number) {
    last = ayah;
  }

  return { update, cancel, noteRecorded };
}
