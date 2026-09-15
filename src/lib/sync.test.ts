// Account-owner guard. Runs in the "node" env with the same localStorage stub
// pattern as syncFlags.test.ts, plus a thenable stub for the InsForge client.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});
vi.stubGlobal("navigator", { onLine: true });

let currentUserId: string | null = "user-b";

/** Every query builder method chains; awaiting one yields an empty result. */
function query(): Record<string, unknown> {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  };
  for (const m of ["select", "eq", "order", "range", "insert", "update", "delete", "limit"]) {
    chain[m] = () => chain;
  }
  chain.maybeSingle = () => ({
    then: (resolve: (v: { data: null; error: null }) => unknown) =>
      resolve({ data: null, error: null }),
  });
  return chain;
}

vi.mock("./insforge", () => ({
  insforge: {
    auth: {
      getCurrentUser: async () => ({
        data: currentUserId ? { user: { id: currentUserId } } : null,
        error: null,
      }),
    },
    database: { from: () => query() },
  },
}));

import {
  makeDebounced, ownerMismatch, getSyncOwner, getSyncStatus, syncNow, resolveOwnerMismatch,
} from "./sync";
import { addEntry, getEntries, getTombstones } from "./journal";
import { recordVisit, recordLastRead, getLocalProgress } from "./progress";

const OWNER_KEY = "mindfulverse.sync.owner.v1";

beforeEach(() => {
  store.clear();
  currentUserId = "user-b";
});

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

describe("ownerMismatch", () => {
  it("is false with no stored owner (first ever sync)", () => {
    expect(ownerMismatch(null, "user-a")).toBe(false);
  });
  it("is false for the same account signing back in", () => {
    expect(ownerMismatch("user-a", "user-a")).toBe(false);
  });
  it("is true for a different account", () => {
    expect(ownerMismatch("user-a", "user-b")).toBe(true);
  });
});

describe("syncNow owner guard", () => {
  it("stamps the owner after a clean pass", async () => {
    await syncNow();
    expect(getSyncOwner()).toBe("user-b");
    expect(getSyncStatus()).toBe("synced");
  });

  it("refuses to touch local data when another account owns it", async () => {
    store.set(OWNER_KEY, "user-a");
    const entry = addEntry({ prompt: "p", body: "b" });
    await syncNow();
    expect(getSyncStatus()).toBe("switched-account");
    expect(getSyncOwner()).toBe("user-a"); // untouched
    expect(getEntries().map((e) => e.id)).toEqual([entry.id]); // nothing pulled/wiped
  });
});

describe("resolveOwnerMismatch", () => {
  it('"merge" keeps local entries and adopts the current account', async () => {
    store.set(OWNER_KEY, "user-a");
    const entry = addEntry({ prompt: "p", body: "b" });
    await resolveOwnerMismatch("merge");
    expect(getSyncOwner()).toBe("user-b");
    expect(getEntries().map((e) => e.id)).toEqual([entry.id]);
    expect(getSyncStatus()).toBe("synced");
  });

  it('"fresh" clears entries, tombstones and progress, then takes ownership', async () => {
    store.set(OWNER_KEY, "user-a");
    addEntry({ prompt: "p", body: "b" });
    store.set("mindfulverse.journal.deleted.v1", JSON.stringify([{ id: "x", deletedAt: 1 }]));
    recordVisit();
    recordLastRead(2, 255);

    await resolveOwnerMismatch("fresh");

    expect(getEntries()).toEqual([]);
    expect(getTombstones()).toEqual([]);
    const p = getLocalProgress();
    expect(p.visits).toEqual([]);
    expect(p.lastRead).toBeNull();
    expect(p.sessionProgress).toEqual({});
    expect(p.surahTadabbur).toEqual({});
    expect(getSyncOwner()).toBe("user-b");
  });

  it("does nothing but report signed-out when nobody is signed in", async () => {
    store.set(OWNER_KEY, "user-a");
    currentUserId = null;
    addEntry({ prompt: "p", body: "b" });
    await resolveOwnerMismatch("fresh");
    expect(getSyncStatus()).toBe("signed-out");
    expect(getEntries()).toHaveLength(1);
    expect(getSyncOwner()).toBe("user-a");
  });
});
