# MindfulVerse v1 — Accounts, Sync, Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in accounts (Google OAuth + email/password) with local-first cloud sync of journal + progress, and a daily-verse push reminder at a user-chosen local time.

**Architecture:** InsForge is the backend (Postgres + RLS, auth, edge functions, schedules). localStorage stays the source of truth; a background sync layer reconciles with per-user rows using commutative merges (journal: union by UUID + soft-delete tombstones; progress: per-key max/union). One Deno edge function `send-reminders`, fired every 15 minutes by an InsForge schedule, sends Web Push notifications.

**Tech Stack:** Vite + React 18 + TypeScript, `@insforge/sdk`, InsForge CLI (`npx -y @insforge/cli`), vite-plugin-pwa (switching to `injectManifest` custom service worker), workbox, `npm:web-push` (in the edge function), vitest (new), Playwright (already a devDependency).

**Spec:** `docs/superpowers/specs/2026-09-15-v1-accounts-sync-push-design.md`

## Global Constraints

- The logged-out experience must remain fully functional and offline-capable. Nothing is gated on auth. The Qur'an (text, translation, reader) is ALWAYS free.
- No LLM-generated or paraphrased religious text anywhere — including notification copy. The push payload body is the verbatim Itani translation of the day's verse.
- Existing localStorage keys must not change: `mindfulverse.journal.v1`, `mindfulverse.visits.v1`, `mindfulverse.sessionProgress.v1`, `mindfulverse.surahTadabbur.v1`, `mindfulverse.lastRead.v1`, `mindfulverse.events.v1`, `mindfulverse.firstSeen.v1`.
- Existing exported function signatures in `src/lib/journal.ts` and `src/lib/progress.ts` must keep working unchanged for current callers.
- `.env` is never committed; `.env.example` documents required variables. Add `.env` and `.env*.local` to `.gitignore`.
- New runtime dependency allowed: `@insforge/sdk` only. New devDependencies allowed: `vitest`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `web-push` (types/local key generation only).
- InsForge CLI is always invoked as `npx -y @insforge/cli <cmd>`.
- All SDK calls check `{ data, error }`; sync failures must never throw into UI code paths.
- Commit after every task (message per task below). End commit messages with the session trailer used by this repo's tooling.

## Deviations from spec (agreed)

- "Account deletion" ships as **Delete my data** (deletes all the user's rows via RLS-scoped SDK deletes, then signs out; local data untouched). The InsForge SDK exposes no self-serve account-record deletion; the spec has been amended to match.

---

## File Structure (end state)

```
migrations/
  <version>_v1-accounts-sync-push.sql   # tables + RLS + grants + trigger
functions/
  send-reminders.ts                     # Deno edge function (pure logic exported for tests)
src/lib/
  insforge.ts                           # SDK client singleton (new)
  auth.tsx                              # AccountProvider + useAccount (new)
  merge.ts                              # pure merge functions (new)
  merge.test.ts                         # (new)
  syncFlags.ts                          # dirty-flag store shared by journal/progress/sync (new)
  sync.ts                               # sync engine: pull → merge → push (new)
  sync.test.ts                          # row-mapping tests (new)
  push.ts                               # push subscribe/unsubscribe helpers (new)
  journal.ts                            # + tombstones + dirty marks (modify)
  progress.ts                           # + dirty marks (modify)
  analytics.ts                          # + account/sync/reminder events (modify)
src/pages/
  Account.tsx                           # (new)
  Journal.tsx, Stats.tsx                # surface changes (modify)
src/
  sw.ts                                 # custom service worker (new)
  App.tsx                               # /account route (modify)
  main.tsx                              # AccountProvider + sync boot (modify)
src/components/AppShell.tsx             # nav item (modify)
vite.config.ts                          # injectManifest strategy (modify)
functions/reminder-logic.test.ts        # vitest tests for the edge function's pure exports
```

---

### Task 1: InsForge project bootstrap + schema migration + SDK client

**Files:**
- Create: `migrations/<version>_v1-accounts-sync-push.sql` (version assigned by CLI)
- Create: `src/lib/insforge.ts`, `.env`, `.env.example`
- Modify: `.gitignore`, `package.json` (adds `@insforge/sdk`)

**Interfaces:**
- Produces: `insforge` — the shared SDK client, imported by every later task as `import { insforge } from "./insforge"` (from `src/lib`).
- Produces: DB tables `journal_entries`, `progress`, `push_subscriptions` with owner-only RLS.

- [ ] **Step 1: Link or create the InsForge project**

Check for `.insforge/project.json`. If missing, run `npx -y @insforge/cli create` (new project) — this is interactive/may require login; if the CLI needs a browser login, ask the user to run `! npx -y @insforge/cli login` in the session. Confirm success by reading `.insforge/project.json` (`oss_host` field is the base URL).

- [ ] **Step 2: Write env files**

Get the anon key: `npx -y @insforge/cli secrets get ANON_KEY`. Create `.env`:

```bash
VITE_INSFORGE_URL=<oss_host from .insforge/project.json>
VITE_INSFORGE_ANON_KEY=<anon key>
VITE_VAPID_PUBLIC_KEY=            # filled in Task 9
```

Create `.env.example` with the same keys and placeholder values. Append to `.gitignore`:

```
.env
.env*.local
```

- [ ] **Step 3: Create the migration**

Run `npx -y @insforge/cli db migrations new v1-accounts-sync-push`, then put this SQL in the created file:

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  context_kind TEXT,
  context_ref TEXT,
  created_at BIGINT NOT NULL,
  deleted_at BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX journal_entries_user_updated ON journal_entries (user_id, updated_at);

CREATE TABLE progress (
  user_id UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  visits JSONB NOT NULL DEFAULT '[]',
  session_progress JSONB NOT NULL DEFAULT '{}',
  surah_tadabbur JSONB NOT NULL DEFAULT '{}',
  last_read JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  keys JSONB NOT NULL,
  reminder_time TEXT NOT NULL,      -- 'HH:MM' local
  timezone TEXT NOT NULL,           -- IANA zone
  last_sent_date TEXT,              -- 'YYYY-MM-DD' in the sub's local zone
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX push_subscriptions_user ON push_subscriptions (user_id);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal_select" ON journal_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_journal_insert" ON journal_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_journal_update" ON journal_entries FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_journal_delete" ON journal_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_progress_select" ON progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_progress_insert" ON progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_progress_update" ON progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_progress_delete" ON progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_push_select" ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_push_insert" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_push_update" ON push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_push_delete" ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries, progress, push_subscriptions TO authenticated;

CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER progress_updated_at BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
```

- [ ] **Step 4: Apply and verify**

Run: `npx -y @insforge/cli db migrations up --all`
Then: `npx -y @insforge/cli db tables` — expect the three tables listed.

- [ ] **Step 5: Install SDK and create the client**

Run: `npm install @insforge/sdk@latest`

Create `src/lib/insforge.ts`:

```typescript
// Shared InsForge client. The SDK auto-detects `insforge_code` in the URL on
// OAuth return and exchanges it for a session, so this module must be imported
// during app startup (it is, via AccountProvider).
import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS (tsc + vite build clean).

- [ ] **Step 7: Commit**

```bash
git add migrations src/lib/insforge.ts .env.example .gitignore package.json package-lock.json
git commit -m "feat: InsForge backend bootstrap — schema, RLS, SDK client"
```

**Human prerequisite (parallel, not blocking):** Google OAuth needs a client in Google Cloud Console with authorized redirect URI `https://<project>.insforge.app/api/auth/oauth/google/callback`, configured in the InsForge dashboard (OAuth providers are dashboard-managed). Email/password works without it. The Account page (Task 6) renders OAuth buttons only for providers present in `npx -y @insforge/cli metadata --json` → `oAuthProviders`, so the app is correct either way.

---

### Task 2: Test infrastructure + merge functions (TDD)

**Files:**
- Create: `src/lib/merge.ts`, `src/lib/merge.test.ts`
- Modify: `package.json` (vitest + `"test": "vitest run"`)

**Interfaces:**
- Produces (consumed by Task 5's sync engine):

```typescript
export interface JournalTombstone { id: string; deletedAt: number }
export interface RemoteJournalRow {
  id: string; prompt: string; body: string;
  context_kind: string | null; context_ref: string | null;
  created_at: number; deleted_at: number | null;
}
export interface JournalMergeResult {
  entries: JournalEntry[];          // new local state (sorted newest first)
  tombstones: JournalTombstone[];   // new local tombstone list
  toInsert: JournalEntry[];         // local entries missing remotely → push
  toDelete: string[];               // remote rows to soft-delete → push
}
export function mergeJournal(
  local: JournalEntry[], tombstones: JournalTombstone[], remote: RemoteJournalRow[]
): JournalMergeResult

export interface LocalProgress {
  visits: string[];
  sessionProgress: Record<string, { step: number; completedAt?: number }>;
  surahTadabbur: Record<string, { ayah: number; updatedAt: number }>;
  lastRead: { surah: number; ayah: number; at: number } | null;
}
export function mergeProgress(local: LocalProgress, remote: LocalProgress | null): LocalProgress
export function rowToEntry(row: RemoteJournalRow): JournalEntry
export function entryToRow(e: JournalEntry): Omit<RemoteJournalRow, "deleted_at">
```

- [ ] **Step 1: Install vitest, add script**

Run: `npm install -D vitest`. Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

`src/lib/merge.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  mergeJournal, mergeProgress, rowToEntry, entryToRow,
  type RemoteJournalRow, type LocalProgress,
} from "./merge";
import type { JournalEntry } from "./types";

const e = (id: string, createdAt: number): JournalEntry =>
  ({ id, createdAt, prompt: "p", body: "b", context: { kind: "free" } });
const r = (id: string, created_at: number, deleted_at: number | null = null): RemoteJournalRow =>
  ({ id, prompt: "p", body: "b", context_kind: "free", context_ref: null, created_at, deleted_at });

describe("mergeJournal", () => {
  it("unions local-only and remote-only entries", () => {
    const res = mergeJournal([e("a", 1)], [], [r("b", 2)]);
    expect(res.entries.map((x) => x.id)).toEqual(["b", "a"]); // newest first
    expect(res.toInsert.map((x) => x.id)).toEqual(["a"]);
    expect(res.toDelete).toEqual([]);
  });
  it("is idempotent when states match", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1)]);
    expect(res.entries).toHaveLength(1);
    expect(res.toInsert).toEqual([]);
    expect(res.toDelete).toEqual([]);
  });
  it("remote soft-delete removes local entry and keeps a tombstone", () => {
    const res = mergeJournal([e("a", 1)], [], [r("a", 1, 99)]);
    expect(res.entries).toEqual([]);
    expect(res.tombstones).toEqual([{ id: "a", deletedAt: 99 }]);
    expect(res.toDelete).toEqual([]);
  });
  it("local tombstone schedules remote soft-delete and never resurrects", () => {
    const res = mergeJournal([], [{ id: "a", deletedAt: 5 }], [r("a", 1)]);
    expect(res.entries).toEqual([]);
    expect(res.toDelete).toEqual(["a"]);
  });
  it("tombstone for an already-deleted remote row pushes nothing", () => {
    const res = mergeJournal([], [{ id: "a", deletedAt: 5 }], [r("a", 1, 5)]);
    expect(res.toDelete).toEqual([]);
  });
});

describe("mergeProgress", () => {
  const base: LocalProgress = {
    visits: ["2026-09-14"],
    sessionProgress: { s1: { step: 2 } },
    surahTadabbur: { "2": { ayah: 10, updatedAt: 100 } },
    lastRead: { surah: 2, ayah: 5, at: 100 },
  };
  it("returns local when remote is null", () => {
    expect(mergeProgress(base, null)).toEqual(base);
  });
  it("unions visits, sorted, capped at 366", () => {
    const remote = { ...base, visits: ["2026-09-13", "2026-09-14"] };
    expect(mergeProgress(base, remote).visits).toEqual(["2026-09-13", "2026-09-14"]);
    const many = Array.from({ length: 400 }, (_, i) =>
      new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
    expect(mergeProgress({ ...base, visits: many }, remote).visits).toHaveLength(366);
  });
  it("takes max step per session; earliest completedAt wins", () => {
    const remote = { ...base, sessionProgress: { s1: { step: 5, completedAt: 50 }, s2: { step: 1 } } };
    const m = mergeProgress({ ...base, sessionProgress: { s1: { step: 2, completedAt: 80 } } }, remote);
    expect(m.sessionProgress).toEqual({ s1: { step: 5, completedAt: 50 }, s2: { step: 1 } });
  });
  it("takes max ayah per surah and latest lastRead", () => {
    const remote = { ...base,
      surahTadabbur: { "2": { ayah: 20, updatedAt: 90 }, "3": { ayah: 1, updatedAt: 1 } },
      lastRead: { surah: 4, ayah: 1, at: 200 } };
    const m = mergeProgress(base, remote);
    expect(m.surahTadabbur["2"]).toEqual({ ayah: 20, updatedAt: 90 });
    expect(m.surahTadabbur["3"]).toEqual({ ayah: 1, updatedAt: 1 });
    expect(m.lastRead).toEqual({ surah: 4, ayah: 1, at: 200 });
  });
});

describe("row mapping", () => {
  it("round-trips entry -> row -> entry", () => {
    const entry: JournalEntry = { id: "x", createdAt: 7, prompt: "q", body: "t",
      context: { kind: "session", ref: "patience" } };
    expect(rowToEntry({ ...entryToRow(entry), deleted_at: null })).toEqual(entry);
  });
  it("omits context when kind is null", () => {
    expect(rowToEntry(r("a", 1)).context).toEqual({ kind: "free" });
    const noCtx = { ...r("a", 1), context_kind: null };
    expect(rowToEntry(noCtx).context).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: FAIL — cannot resolve `./merge`.

- [ ] **Step 4: Implement `src/lib/merge.ts`**

```typescript
// Pure merge logic for local-first sync. Every merge is commutative and
// idempotent: journal = union by id with soft-delete tombstones winning;
// progress = per-key max / earliest-completion / latest-read / set-union.
import type { JournalEntry } from "./types";

export interface JournalTombstone { id: string; deletedAt: number }
export interface RemoteJournalRow {
  id: string; prompt: string; body: string;
  context_kind: string | null; context_ref: string | null;
  created_at: number; deleted_at: number | null;
}
export interface JournalMergeResult {
  entries: JournalEntry[];
  tombstones: JournalTombstone[];
  toInsert: JournalEntry[];
  toDelete: string[];
}

export function rowToEntry(row: RemoteJournalRow): JournalEntry {
  const entry: JournalEntry = {
    id: row.id, createdAt: row.created_at, prompt: row.prompt, body: row.body,
  };
  if (row.context_kind) {
    entry.context = {
      kind: row.context_kind as NonNullable<JournalEntry["context"]>["kind"],
      ...(row.context_ref ? { ref: row.context_ref } : {}),
    };
  }
  return entry;
}

export function entryToRow(e: JournalEntry): Omit<RemoteJournalRow, "deleted_at"> {
  return {
    id: e.id, prompt: e.prompt, body: e.body,
    context_kind: e.context?.kind ?? null, context_ref: e.context?.ref ?? null,
    created_at: e.createdAt,
  };
}

export function mergeJournal(
  local: JournalEntry[], tombstones: JournalTombstone[], remote: RemoteJournalRow[]
): JournalMergeResult {
  const dead = new Map(tombstones.map((t) => [t.id, t.deletedAt]));
  for (const row of remote) {
    if (row.deleted_at != null && !dead.has(row.id)) dead.set(row.id, row.deleted_at);
  }
  const merged = new Map<string, JournalEntry>();
  for (const e of local) if (!dead.has(e.id)) merged.set(e.id, e);
  const remoteIds = new Set<string>();
  for (const row of remote) {
    remoteIds.add(row.id);
    if (!dead.has(row.id) && !merged.has(row.id)) merged.set(row.id, rowToEntry(row));
  }
  const remoteDeleted = new Set(remote.filter((r) => r.deleted_at != null).map((r) => r.id));
  return {
    entries: [...merged.values()].sort((a, b) => b.createdAt - a.createdAt),
    tombstones: [...dead].map(([id, deletedAt]) => ({ id, deletedAt })),
    toInsert: local.filter((e) => !dead.has(e.id) && !remoteIds.has(e.id)),
    toDelete: [...dead.keys()].filter((id) => remoteIds.has(id) && !remoteDeleted.has(id)),
  };
}

export interface LocalProgress {
  visits: string[];
  sessionProgress: Record<string, { step: number; completedAt?: number }>;
  surahTadabbur: Record<string, { ayah: number; updatedAt: number }>;
  lastRead: { surah: number; ayah: number; at: number } | null;
}

export function mergeProgress(local: LocalProgress, remote: LocalProgress | null): LocalProgress {
  if (!remote) return local;
  const visits = [...new Set([...local.visits, ...remote.visits])].sort().slice(-366);
  const sessionProgress: LocalProgress["sessionProgress"] = {};
  for (const key of new Set([...Object.keys(local.sessionProgress), ...Object.keys(remote.sessionProgress)])) {
    const a = local.sessionProgress[key], b = remote.sessionProgress[key];
    const completions = [a?.completedAt, b?.completedAt].filter((x): x is number => x != null);
    sessionProgress[key] = {
      step: Math.max(a?.step ?? -1, b?.step ?? -1),
      ...(completions.length ? { completedAt: Math.min(...completions) } : {}),
    };
  }
  const surahTadabbur: LocalProgress["surahTadabbur"] = {};
  for (const key of new Set([...Object.keys(local.surahTadabbur), ...Object.keys(remote.surahTadabbur)])) {
    const a = local.surahTadabbur[key], b = remote.surahTadabbur[key];
    surahTadabbur[key] = !a ? b! : !b ? a : a.ayah >= b.ayah ? a : b;
  }
  const lastRead =
    !local.lastRead ? remote.lastRead :
    !remote.lastRead ? local.lastRead :
    local.lastRead.at >= remote.lastRead.at ? local.lastRead : remote.lastRead;
  return { visits, sessionProgress, surahTadabbur, lastRead };
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/merge.ts src/lib/merge.test.ts package.json package-lock.json
git commit -m "feat: pure merge functions for journal + progress sync (TDD)"
```

---

### Task 3: Dirty flags + journal tombstones

**Files:**
- Create: `src/lib/syncFlags.ts`
- Modify: `src/lib/journal.ts`, `src/lib/progress.ts`
- Test: extend `src/lib/merge.test.ts`? No — create `src/lib/syncFlags.test.ts`

**Interfaces:**
- Produces (consumed by Task 5):

```typescript
// syncFlags.ts
export function markJournalDirty(): void
export function markProgressDirty(): void
export function isDirty(): boolean           // either flag set
export function clearDirty(): void           // clears both
export function onDirty(cb: () => void): void  // sync engine registers its debounced trigger
// journal.ts additions
export function getTombstones(): JournalTombstone[]
export function replaceAll(entries: JournalEntry[], tombstones: JournalTombstone[]): void // sync writes merged state back
// progress.ts additions
export function getLocalProgress(): LocalProgress
export function replaceLocalProgress(p: LocalProgress): void
```

- [ ] **Step 1: Write failing tests** — `src/lib/syncFlags.test.ts`:

```typescript
// vitest with jsdom-like localStorage: run in "node" env with a tiny stub.
import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

import { markJournalDirty, isDirty, clearDirty, onDirty } from "./syncFlags";
import { addEntry, deleteEntry, getEntries, getTombstones, replaceAll } from "./journal";

beforeEach(() => { store.clear(); clearDirty(); });

describe("syncFlags", () => {
  it("starts clean, marks dirty, clears", () => {
    expect(isDirty()).toBe(false);
    markJournalDirty();
    expect(isDirty()).toBe(true);
    clearDirty();
    expect(isDirty()).toBe(false);
  });
  it("notifies the registered listener on mark", () => {
    const cb = vi.fn();
    onDirty(cb);
    markJournalDirty();
    expect(cb).toHaveBeenCalledOnce();
  });
});

describe("journal tombstones", () => {
  it("deleteEntry records a tombstone", () => {
    const e = addEntry({ prompt: "p", body: "b" });
    deleteEntry(e.id);
    expect(getEntries()).toEqual([]);
    expect(getTombstones().map((t) => t.id)).toEqual([e.id]);
  });
  it("replaceAll swaps state without marking dirty", () => {
    clearDirty();
    replaceAll([{ id: "z", createdAt: 1, prompt: "", body: "b" }], []);
    expect(getEntries()).toHaveLength(1);
    expect(isDirty()).toBe(false);
  });
  it("addEntry marks dirty", () => {
    addEntry({ prompt: "p", body: "b" });
    expect(isDirty()).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run src/lib/syncFlags.test.ts` (module not found).

- [ ] **Step 3: Implement**

`src/lib/syncFlags.ts`:

```typescript
// Dirty-state bridge between the storage modules (journal/progress) and the
// sync engine — its own module so journal.ts never imports sync.ts (no cycle).
const DIRTY_KEY = "mindfulverse.sync.dirty.v1"; // "1" when a push is pending

let listener: (() => void) | null = null;

export function onDirty(cb: () => void): void { listener = cb; }

function mark(): void {
  try { localStorage.setItem(DIRTY_KEY, "1"); } catch { /* storage full — sync will full-diff anyway */ }
  listener?.();
}
export function markJournalDirty(): void { mark(); }
export function markProgressDirty(): void { mark(); }
export function isDirty(): boolean {
  try { return localStorage.getItem(DIRTY_KEY) === "1"; } catch { return false; }
}
export function clearDirty(): void {
  try { localStorage.removeItem(DIRTY_KEY); } catch { /* ignore */ }
}
```

`src/lib/journal.ts` — add imports and tombstone handling; keep every existing export working:

```typescript
import type { JournalTombstone } from "./merge";
import { markJournalDirty } from "./syncFlags";

const TOMBSTONES_KEY = "mindfulverse.journal.deleted.v1";

export function getTombstones(): JournalTombstone[] {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    return raw ? (JSON.parse(raw) as JournalTombstone[]) : [];
  } catch { return []; }
}

/** Sync engine writes merged state back; never marks dirty. */
export function replaceAll(entries: JournalEntry[], tombstones: JournalTombstone[]): void {
  writeAll(entries);
  localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombstones));
}
```

Change `addEntry` to call `markJournalDirty()` after `writeAll(all)`. Change `deleteEntry` to:

```typescript
export function deleteEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
  const tombs = getTombstones();
  if (!tombs.some((t) => t.id === id)) {
    tombs.push({ id, deletedAt: Date.now() });
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(tombs));
  }
  markJournalDirty();
}
```

`src/lib/progress.ts` — add at top `import { markProgressDirty } from "./syncFlags";` and `import type { LocalProgress } from "./merge";`. Call `markProgressDirty()` at the end of each mutating function that actually wrote (`recordVisit` when it pushed a new day, `recordSessionStep` when it advanced, `recordSurahTadabbur` when it advanced, `recordLastRead`, `recordSessionComplete`). Add:

```typescript
export function getLocalProgress(): LocalProgress {
  return {
    visits: readVisits(),
    sessionProgress: readSessions(),
    surahTadabbur: readSurahTadabbur(),
    lastRead: getLastRead(),
  };
}

/** Sync engine writes merged state back; never marks dirty. */
export function replaceLocalProgress(p: LocalProgress): void {
  localStorage.setItem(VISITS_KEY, JSON.stringify(p.visits));
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(p.sessionProgress));
  localStorage.setItem(SURAH_TADABBUR_KEY, JSON.stringify(p.surahTadabbur));
  if (p.lastRead) localStorage.setItem(LAST_READ_KEY, JSON.stringify(p.lastRead));
}
```

Note: `SessionProgress.step` type in progress.ts and merge.ts's inline `{ step: number; completedAt?: number }` must stay structurally identical.

- [ ] **Step 4: Run tests, verify PASS** — `npx vitest run` (all files).

- [ ] **Step 5: Verify build** — `npm run build`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/syncFlags.ts src/lib/syncFlags.test.ts src/lib/journal.ts src/lib/progress.ts
git commit -m "feat: dirty flags and journal tombstones for sync"
```

---

### Task 4: Auth provider

**Files:**
- Create: `src/lib/auth.tsx`
- Modify: `src/main.tsx` (wrap app in `AccountProvider`)

**Interfaces:**
- Consumes: `insforge` from Task 1.
- Produces: `useAccount(): { user: AccountUser | null; loading: boolean; refresh: () => Promise<void> }` where `AccountUser = { id: string; email: string; name?: string }`. Consumed by Tasks 5, 6, 7, 9.

- [ ] **Step 1: Implement `src/lib/auth.tsx`**

```tsx
// Opt-in identity. user===null && !loading means signed out; the whole app
// works in that state. The SDK stores the access token in memory and
// rehydrates from an httpOnly refresh cookie, so getCurrentUser() must run
// once on startup — during that round-trip `loading` is true.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { insforge } from "./insforge";

export interface AccountUser { id: string; email: string; name?: string }

interface AccountState {
  user: AccountUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AccountContext = createContext<AccountState>({
  user: null, loading: true, refresh: async () => {},
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await insforge.auth.getCurrentUser();
    setUser(error || !data?.user ? null : {
      id: data.user.id, email: data.user.email, name: data.user.name ?? undefined,
    });
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <AccountContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountState {
  return useContext(AccountContext);
}
```

If `data.user`'s shape differs (check the SDK's TypeScript types once installed — e.g. name under `profile`), adapt the mapping here only; `AccountUser` is the app-facing contract.

- [ ] **Step 2: Wire into `src/main.tsx`**

Wrap the existing tree: `<AccountProvider><BrowserRouter>...</BrowserRouter></AccountProvider>` (place outside the router; it has no routing dependency). Keep all existing bootstrapping (`trackAppOpen`, `recordVisit`, theme) untouched.

- [ ] **Step 3: Verify** — `npm run build` passes; `npm run dev`, load the app, confirm no console errors and the app renders signed-out.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.tsx src/main.tsx
git commit -m "feat: account context with InsForge auth hydration"
```

---

### Task 5: Sync engine

**Files:**
- Create: `src/lib/sync.ts`, `src/lib/sync.test.ts`
- Modify: `src/main.tsx` (call `initSync()` once)

**Interfaces:**
- Consumes: `insforge`, merge functions (Task 2), `journal.ts`/`progress.ts`/`syncFlags.ts` additions (Task 3).
- Produces (consumed by Tasks 6–7 UI):

```typescript
export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";
export function getSyncStatus(): SyncStatus
export function onSyncStatus(cb: (s: SyncStatus) => void): () => void  // returns unsubscribe
export function syncNow(): Promise<void>       // safe to call anytime; no-op when signed out
export function initSync(): void               // registers visibility/online/dirty triggers
```

- [ ] **Step 1: Write failing tests for the pure scheduling helper**

The network parts are exercised by the e2e task; unit-test the one pure piece — debounce coalescing. In `src/lib/sync.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run src/lib/sync.test.ts`.

- [ ] **Step 3: Implement `src/lib/sync.ts`**

```typescript
// Local-first sync: pull remote → merge (commutative, from merge.ts) → write
// merged state locally → push the diff. Runs on sign-in, tab focus, reconnect,
// and debounced after local writes. Failures set status and retry on the next
// trigger — they never surface as exceptions to callers.
import { insforge } from "./insforge";
import {
  mergeJournal, mergeProgress, entryToRow,
  type RemoteJournalRow, type LocalProgress,
} from "./merge";
import { getEntries, getTombstones, replaceAll } from "./journal";
import { getLocalProgress, replaceLocalProgress } from "./progress";
import { isDirty, clearDirty, onDirty } from "./syncFlags";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error" | "signed-out";

let status: SyncStatus = "idle";
const listeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: SyncStatus): void {
  status = s;
  listeners.forEach((cb) => cb(s));
}
export function getSyncStatus(): SyncStatus { return status; }
export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function makeDebounced(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

let inFlight = false;

export async function syncNow(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const { data: userData } = await insforge.auth.getCurrentUser();
    const userId = userData?.user?.id;
    if (!userId) { setStatus("signed-out"); return; }
    if (!navigator.onLine) { setStatus("offline"); return; }
    setStatus("syncing");

    // --- journal ---
    const { data: remoteRows, error: pullErr } = await insforge.database
      .from("journal_entries")
      .select("id, prompt, body, context_kind, context_ref, created_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (pullErr) { setStatus("error"); return; }
    const merged = mergeJournal(getEntries(), getTombstones(), (remoteRows ?? []) as RemoteJournalRow[]);
    replaceAll(merged.entries, merged.tombstones);
    if (merged.toInsert.length > 0) {
      const { error } = await insforge.database
        .from("journal_entries")
        .insert(merged.toInsert.map(entryToRow));
      if (error) { setStatus("error"); return; }
    }
    for (const id of merged.toDelete) {
      const tomb = merged.tombstones.find((t) => t.id === id);
      const { error } = await insforge.database
        .from("journal_entries")
        .update({ deleted_at: tomb?.deletedAt ?? Date.now() })
        .eq("id", id);
      if (error) { setStatus("error"); return; }
    }

    // --- progress ---
    const { data: remoteProgress, error: progErr } = await insforge.database
      .from("progress")
      .select("visits, session_progress, surah_tadabbur, last_read")
      .eq("user_id", userId)
      .maybeSingle();
    if (progErr) { setStatus("error"); return; }
    const remoteLp: LocalProgress | null = remoteProgress
      ? {
          visits: remoteProgress.visits ?? [],
          sessionProgress: remoteProgress.session_progress ?? {},
          surahTadabbur: remoteProgress.surah_tadabbur ?? {},
          lastRead: remoteProgress.last_read ?? null,
        }
      : null;
    const mergedProgress = mergeProgress(getLocalProgress(), remoteLp);
    replaceLocalProgress(mergedProgress);
    const row = {
      visits: mergedProgress.visits,
      session_progress: mergedProgress.sessionProgress,
      surah_tadabbur: mergedProgress.surahTadabbur,
      last_read: mergedProgress.lastRead,
    };
    if (remoteProgress) {
      const { error } = await insforge.database.from("progress").update(row).eq("user_id", userId);
      if (error) { setStatus("error"); return; }
    } else {
      const { error } = await insforge.database.from("progress").insert([row]);
      if (error) { setStatus("error"); return; }
    }

    clearDirty();
    setStatus("synced");
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  } finally {
    inFlight = false;
  }
}

const debouncedSync = makeDebounced(() => void syncNow(), 3000);

export function initSync(): void {
  onDirty(debouncedSync);
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  if (isDirty()) debouncedSync();
  void syncNow(); // covers the sign-in-then-reload case
}
```

- [ ] **Step 4: Run tests, verify PASS** — `npx vitest run`.

- [ ] **Step 5: Wire into `src/main.tsx`** — after render setup, call `initSync()` once (import from `./lib/sync`).

- [ ] **Step 6: Verify build** — `npm run build`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sync.ts src/lib/sync.test.ts src/main.tsx
git commit -m "feat: local-first sync engine (pull, merge, push)"
```

---

### Task 6: Account page, route, nav, analytics events

**Files:**
- Create: `src/pages/Account.tsx`
- Modify: `src/App.tsx` (route), `src/components/AppShell.tsx` (nav item), `src/lib/analytics.ts` (events)

**Interfaces:**
- Consumes: `useAccount` (Task 4), `syncNow`/`onSyncStatus`/`getSyncStatus` (Task 5), `insforge` (Task 1), `track` (analytics).
- Produces: `/account` route. Reminder UI is added by Task 9 — leave a clearly marked section placeholder element (`<section id="reminders" />` rendered empty) is NOT allowed; instead Task 9 adds its own section. Account.tsx here ships without any reminder UI.

- [ ] **Step 1: Extend analytics events**

In `src/lib/analytics.ts`, extend the union (keep every existing member):

```typescript
  | { type: "account_signup"; method: "password" | "google" }
  | { type: "account_signin"; method: "password" | "google" }
  | { type: "account_signout" }
  | { type: "sync_done"; ok: boolean }
  | { type: "reminder_set"; enabled: boolean }
```

- [ ] **Step 2: Implement `src/pages/Account.tsx`**

Follow the visual idiom of existing pages (read `Stats.tsx` first and mirror its layout/classes). Behavior spec:

```tsx
import { useEffect, useState } from "react";
import { useAccount } from "../lib/auth";
import { insforge } from "../lib/insforge";
import { getSyncStatus, onSyncStatus, syncNow, type SyncStatus } from "../lib/sync";
import { track } from "../lib/analytics";

export default function Account() {
  const { user, loading, refresh } = useAccount();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);

  useEffect(() => onSyncStatus(setStatus), []);
  useEffect(() => {
    // Enabled providers come from backend metadata; render only what exists.
    fetch(`${import.meta.env.VITE_INSFORGE_URL}/api/metadata/auth`, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_INSFORGE_ANON_KEY}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => setOauthProviders(m?.oAuthProviders ?? []))
      .catch(() => setOauthProviders([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup") {
      const { data, error } = await insforge.auth.signUp({ email, password });
      if (error) return setError(error.message);
      track({ type: "account_signup", method: "password" });
      if (data?.requireEmailVerification) {
        setNotice("Check your email to verify your address, then sign in.");
        setMode("signin");
        return;
      }
    } else {
      const { error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
      track({ type: "account_signin", method: "password" });
    }
    await refresh();
    await syncNow();
    setNotice("Signed in — your journal is now backed up to your account.");
  }

  async function google() {
    track({ type: "account_signin", method: "google" });
    await insforge.auth.signInWithOAuth("google", {
      redirectTo: `${window.location.origin}/account`,
    });
  }

  async function signOut() {
    await insforge.auth.signOut();
    track({ type: "account_signout" });
    await refresh();
    setNotice("Signed out. Your entries stay on this device but are no longer backed up.");
  }

  async function deleteMyData() {
    if (!user) return;
    const sure = window.confirm(
      "Delete all synced data from your account? Entries on this device are kept."
    );
    if (!sure) return;
    await insforge.database.from("journal_entries").delete().eq("user_id", user.id);
    await insforge.database.from("progress").delete().eq("user_id", user.id);
    await insforge.database.from("push_subscriptions").delete().eq("user_id", user.id);
    await signOut();
  }

  // Render (match AppShell page conventions):
  // loading → skeleton.
  // signed out → intro copy ("Optional. The Qur'an is always free — an account
  //   only backs up your journal and progress."), email+password form with
  //   signin/signup toggle, Google button only if oauthProviders.includes("google").
  // signed in → email, sync status line
  //   (synced: "Backed up ✓" · syncing: "Backing up…" · offline: "Offline — will
  //   sync when you're back" · error: "Backup hit a snag — will retry"),
  //   "Sync now" button → syncNow(), a link to the Journal page's existing
  //   export ("Export journal"), Sign out button, Delete-my-data (danger).
}
```

If the metadata fetch path differs, get the shape from `npx -y @insforge/cli metadata --json` during implementation and use the equivalent HTTP endpoint the CLI documents; fallback on failure is `[]` (no OAuth buttons) — never a broken page. When sync status transitions to `synced` or `error`, fire `track({ type: "sync_done", ok: status === "synced" })` — do this inside the `onSyncStatus` subscription, only on transition (compare to previous value).

- [ ] **Step 3: Route + nav**

`src/App.tsx`: add `import Account from "./pages/Account";` and `<Route path="/account" element={<Account />} />` before the `*` route. `src/components/AppShell.tsx`: read the file, find the nav-items structure, and append an "Account" item pointing at `/account` matching the existing item shape (icon choice: mirror how other items define icons; a simple person glyph consistent with the set).

- [ ] **Step 4: Verify** — `npm run build` passes. `npm run dev`: `/account` renders signed-out state; sign-up with a throwaway email works against the real backend (if email verification is enabled, the notice shows); after sign-in the status line reaches "Backed up ✓" and `npx -y @insforge/cli db query "SELECT count(*) FROM progress"` returns 1.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Account.tsx src/App.tsx src/components/AppShell.tsx src/lib/analytics.ts
git commit -m "feat: account page — sign in/up, OAuth, sync status, delete-my-data"
```

---

### Task 7: Journal + Stats surface changes

**Files:**
- Modify: `src/pages/Journal.tsx`, `src/pages/Stats.tsx`

**Interfaces:**
- Consumes: `useAccount` (Task 4), `getSyncStatus`/`onSyncStatus` (Task 5).

- [ ] **Step 1: Journal page** — read `src/pages/Journal.tsx` first. Locate the existing backup nudge (the "export/backup" prompt). Change behavior:
  - Signed out: nudge copy becomes a link to `/account`: "Entries live only on this device. Sign in to back them up." (keep the existing export affordance).
  - Signed in: replace the nudge with a one-line sync status (same wording set as Account page), subscribing via `onSyncStatus` in a `useEffect`.

- [ ] **Step 2: Stats page** — read `src/pages/Stats.tsx`; add an "Account" row/card: signed out → "Not signed in — journal is device-only" linking to `/account`; signed in → the account email + backup status.

- [ ] **Step 3: Verify** — `npm run build`; `npm run dev` and check both pages in both auth states.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Journal.tsx src/pages/Stats.tsx
git commit -m "feat: sync status on journal and stats pages"
```

---

### Task 8: Service worker migration to injectManifest (custom SW with push handlers)

**Files:**
- Create: `src/sw.ts`
- Modify: `vite.config.ts`, `package.json` (workbox devDependencies), `tsconfig.json` (only if `WebWorker` lib is needed for sw.ts — prefer a `/// <reference lib="webworker" />` pragma instead)

**Interfaces:**
- Produces: a service worker that (a) precaches the app shell, (b) runtime-caches `/data/` CacheFirst — byte-for-byte behavior parity with the current `generateSW` config — and (c) handles `push` + `notificationclick`. Consumed by Task 9 (push subscribe needs `navigator.serviceWorker.ready`).

- [ ] **Step 1: Install workbox modules**

Run: `npm install -D workbox-precaching workbox-routing workbox-strategies workbox-expiration`

- [ ] **Step 2: Write `src/sw.ts`**

```typescript
/// <reference lib="webworker" />
// Custom service worker (injectManifest). Precache + /data caching preserve
// the exact behavior of the previous generateSW config; push handlers are new.
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
self.addEventListener("activate", () => void self.clients.claim());

registerRoute(
  ({ url }) => url.pathname.startsWith("/data/"),
  new CacheFirst({
    cacheName: "quran-data",
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try { payload = event.data?.json() ?? {}; } catch { /* non-JSON push — show default */ }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "MindfulVerse", {
      body: payload.body ?? "Today's verse is waiting for you.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url ?? "/checkin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/checkin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 3: Switch `vite.config.ts` to injectManifest**

Replace the `VitePWA({...})` options: keep `registerType`, `includeAssets`, `manifest` unchanged; replace the `workbox` block with:

```typescript
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
```

- [ ] **Step 4: Verify offline parity**

Run: `npm run build && npm run preview`. In a browser: load once, DevTools → Network → Offline, reload — app shell and a previously visited surah still load (quran-data cache hit). Confirm `dist/sw.js` exists and the registered SW activates.

- [ ] **Step 5: Commit**

```bash
git add src/sw.ts vite.config.ts package.json package-lock.json
git commit -m "feat: custom service worker with push handlers (injectManifest)"
```

---

### Task 9: Client push subscription + reminder UI

**Files:**
- Create: `src/lib/push.ts`
- Modify: `src/pages/Account.tsx` (reminders section), `.env` / `.env.example` (`VITE_VAPID_PUBLIC_KEY` value)

**Interfaces:**
- Consumes: SW from Task 8, `insforge`, `useAccount`, `track`.
- Produces (consumed by Account UI):

```typescript
export function pushSupport(): "ok" | "needs-install" | "unsupported"
export async function getReminder(): Promise<{ time: string } | null>   // this device's subscription
export async function enableReminder(time: string): Promise<{ error: string | null }>
export async function disableReminder(): Promise<void>
```

- [ ] **Step 1: Generate VAPID keys and store them**

```bash
npx -y web-push generate-vapid-keys
npx -y @insforge/cli secrets add VAPID_PUBLIC_KEY <publicKey>
npx -y @insforge/cli secrets add VAPID_PRIVATE_KEY <privateKey>
npx -y @insforge/cli secrets add VAPID_SUBJECT "mailto:mohammedfirdousaraoye@gmail.com"
```

Put the public key into `.env` as `VITE_VAPID_PUBLIC_KEY` (public by design — safe in the client bundle).

- [ ] **Step 2: Implement `src/lib/push.ts`**

```typescript
// Web Push subscription management. A subscription row belongs to this
// device+account pair; a user can hold one row per device.
import { insforge } from "./insforge";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupport(): "ok" | "needs-install" | "unsupported" {
  if ("Notification" in window && "PushManager" in window && "serviceWorker" in navigator) return "ok";
  // iOS Safari exposes push only to installed (home-screen) PWAs.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isIOS ? "needs-install" : "unsupported";
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function getReminder(): Promise<{ time: string } | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const { data } = await insforge.database
    .from("push_subscriptions")
    .select("reminder_time")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  return data ? { time: data.reminder_time } : null;
}

export async function enableReminder(time: string): Promise<{ error: string | null }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "Notifications were not allowed." };
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    }));
  const json = sub.toJSON();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // endpoint is the PK: delete-then-insert acts as an upsert under RLS.
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await insforge.database.from("push_subscriptions").insert([
    { endpoint: sub.endpoint, keys: json.keys, reminder_time: time, timezone },
  ]);
  return { error: error ? error.message : null };
}

export async function disableReminder(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
```

- [ ] **Step 3: Reminders section in `Account.tsx`**

Rendered only when signed in. States:
- `pushSupport() === "needs-install"` → copy: "To get reminders on iPhone, first add MindfulVerse to your Home Screen (Share → Add to Home Screen), then return here." No toggle.
- `"unsupported"` → "This browser doesn't support notifications."
- `"ok"` → toggle + `<input type="time" defaultValue="07:00">`. Enable → `enableReminder(time)`; on success `track({ type: "reminder_set", enabled: true })` and show "Daily verse reminder set for {time}". Disable → `disableReminder()` + `track({ type: "reminder_set", enabled: false })`. Load current state on mount via `getReminder()`.

- [ ] **Step 4: Verify**

`npm run build && npm run preview` (SW required — dev mode won't have one). Sign in, enable a reminder 2–3 minutes ahead, confirm a row: `npx -y @insforge/cli db query "SELECT endpoint, reminder_time, timezone FROM push_subscriptions"`. (Delivery is verified in Task 10.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/push.ts src/pages/Account.tsx .env.example
git commit -m "feat: web push subscription + reminder time UI"
```

---

### Task 10: `send-reminders` edge function + schedule (TDD on the pure logic)

**Files:**
- Create: `functions/send-reminders.ts`, `functions/reminder-logic.test.ts`

**Interfaces:**
- Consumes: `push_subscriptions` table, VAPID secrets (Task 9), the deployed site's `/data/quran/{surah}.json` for verse text.
- Produces: deployed function `send-reminders` + an InsForge schedule firing it every 15 minutes.

**Design constraint honored here:** the function file uses **dynamic imports** for `npm:@insforge/sdk` and `npm:web-push` inside the handler, so vitest can import the module's pure exports without touching Deno-only specifiers.

- [ ] **Step 1: Write the failing tests** — `functions/reminder-logic.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  minutesOfDayInZone, localDayIndexInZone, verseKeyForDayIndex, isDue, localDateInZone,
} from "./send-reminders";

// 2026-09-15T12:00:00Z fixed instant
const T = Date.UTC(2026, 8, 15, 12, 0, 0);

describe("timezone math", () => {
  it("minutes of day respects the zone", () => {
    expect(minutesOfDayInZone(T, "UTC")).toBe(12 * 60);
    expect(minutesOfDayInZone(T, "Africa/Lagos")).toBe(13 * 60);        // UTC+1
    expect(minutesOfDayInZone(T, "America/New_York")).toBe(8 * 60);    // EDT, UTC-4
  });
  it("local date string respects the zone", () => {
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "Africa/Lagos")).toBe("2026-09-16");
    expect(localDateInZone(Date.UTC(2026, 8, 15, 23, 30), "UTC")).toBe("2026-09-15");
  });
  it("day index matches the client formula (floor of local-midnight epoch / 86.4M)", () => {
    // Client: new Date(y,m,d).getTime()/86_400_000 floored, in the user's zone.
    // For Lagos (UTC+1), local midnight of 2026-09-15 is 2026-09-14T23:00Z.
    const lagosMidnightUtc = Date.UTC(2026, 8, 14, 23, 0, 0);
    expect(localDayIndexInZone(T, "Africa/Lagos")).toBe(Math.floor(lagosMidnightUtc / 86_400_000));
    // For New York (UTC-4), local midnight is 2026-09-15T04:00Z.
    const nyMidnightUtc = Date.UTC(2026, 8, 15, 4, 0, 0);
    expect(localDayIndexInZone(T, "America/New_York")).toBe(Math.floor(nyMidnightUtc / 86_400_000));
  });
});

describe("verse rotation", () => {
  it("stride-53 walk over a 139-verse pool, matching src/lib/dailyVerse.ts", () => {
    expect(verseKeyForDayIndex(0)).toBe("94:5");    // index 0
    expect(verseKeyForDayIndex(1)).toBe("3:31");    // (1*53)%139 = 53
    expect(verseKeyForDayIndex(139)).toBe(verseKeyForDayIndex(0)); // full cycle
  });
});

describe("isDue", () => {
  it("fires within the 15-minute window after the reminder time", () => {
    expect(isDue("07:00", 7 * 60)).toBe(true);
    expect(isDue("07:00", 7 * 60 + 14)).toBe(true);
    expect(isDue("07:00", 7 * 60 + 15)).toBe(false);
    expect(isDue("07:00", 7 * 60 - 1)).toBe(false);
  });
  it("handles the midnight wrap", () => {
    expect(isDue("00:05", 23 * 60 + 59)).toBe(false);
    expect(isDue("23:55", 23 * 60 + 56)).toBe(true);
    expect(isDue("00:05", 6)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run functions/reminder-logic.test.ts` (module not found). Add `functions/**/*.test.ts` to vitest's default include if needed (default `**/*.test.ts` already covers it).

- [ ] **Step 3: Implement `functions/send-reminders.ts`**

```typescript
// Edge function (Deno Subhosting): sends the daily-verse Web Push reminder.
// Fired every 15 minutes by an InsForge schedule. Pure helpers are exported
// and unit-tested with vitest; Deno-only modules are imported dynamically
// inside the handler so this file stays importable from Node test runners.

// Same pool + stride as src/lib/dailyVerse.ts — keep the two in sync.
const DAILY_VERSES: string[] = [
  "94:5", "94:6", "94:1", "94:2", "94:3", "94:4", "94:7", "94:8", "93:1", "93:2",
  "93:3", "93:4", "93:5", "93:7", "93:11", "3:139", "39:53", "12:87", "10:57", "10:58",
  "10:62", "10:64", "16:96", "16:97", "2:25", "18:107", "19:96", "85:11", "39:17", "39:18",
  "41:30", "41:31", "46:13", "2:268", "11:115", "25:75", "76:12", "13:28", "2:186", "50:16",
  "20:46", "33:3", "9:51", "26:62", "3:174", "8:2", "2:255", "24:35", "2:286", "42:25",
  "11:90", "85:14", "57:28", "3:31", "6:54", "4:110", "23:118", "21:83", "28:16", "110:3",
  "3:159", "39:66", "29:69", "2:45", "2:153", "2:156", "2:157", "3:200", "103:3", "90:17",
  "41:35", "32:24", "16:127", "16:128", "40:55", "50:39", "31:22", "73:8", "2:201", "3:8",
  "25:74", "14:40", "17:80", "20:25", "20:26", "28:24", "112:1", "112:2", "112:3", "112:4",
  "113:1", "114:1", "33:41", "33:42", "33:43", "7:205", "76:25", "3:191", "29:60", "11:6",
  "17:30", "34:39", "42:19", "51:58", "67:15", "39:52", "28:73", "16:53", "55:13", "30:21",
  "30:22", "16:65", "16:66", "16:68", "16:69", "36:33", "36:34", "36:36", "55:5", "55:6",
  "55:10", "67:19", "88:17", "88:18", "88:19", "88:20", "51:47", "51:49", "78:6", "78:7",
  "78:8", "78:9", "78:10", "78:11", "2:152", "16:18", "27:19", "108:1", "108:2",
];

interface ZoneParts { year: number; month: number; day: number; hour: number; minute: number }

function partsInZone(utcMs: number, timeZone: string): ZoneParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}

export function minutesOfDayInZone(utcMs: number, timeZone: string): number {
  const { hour, minute } = partsInZone(utcMs, timeZone);
  return hour * 60 + minute;
}

export function localDateInZone(utcMs: number, timeZone: string): string {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Replicates the client: floor(epoch-of-local-midnight / 86_400_000). */
export function localDayIndexInZone(utcMs: number, timeZone: string): number {
  const { year, month, day } = partsInZone(utcMs, timeZone);
  // Zone offset now (ms): zone wall-clock reinterpreted as UTC, minus real UTC.
  const p = partsInZone(utcMs, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncatedUtc = Math.floor(utcMs / 60_000) * 60_000;
  const offsetMs = wallAsUtc - truncatedUtc;
  const localMidnightUtc = Date.UTC(year, month - 1, day) - offsetMs;
  return Math.floor(localMidnightUtc / 86_400_000);
}

export function verseKeyForDayIndex(dayIndex: number): string {
  const n = DAILY_VERSES.length;
  return DAILY_VERSES[((dayIndex * 53) % n + n) % n];
}

/** Due when reminderTime ('HH:MM') falls in [now, now+15min), wrapping midnight. */
export function isDue(reminderTime: string, nowMinutes: number, windowMinutes = 15): boolean {
  const [h, m] = reminderTime.split(":").map(Number);
  const reminder = h * 60 + m;
  return ((reminder - nowMinutes + 1440) % 1440) < windowMinutes;
}

const SITE_URL = "https://mindfulverse.vercel.app";

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const { createClient } = await import("npm:@insforge/sdk");
  const webpush = (await import("npm:web-push")).default;

  const admin = createClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    // Admin/API key: reads every user's subscriptions (bypasses RLS).
    accessToken: Deno.env.get("API_KEY"),
  });

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = Date.now();
  const { data: subs, error } = await admin.database
    .from("push_subscriptions")
    .select("endpoint, keys, reminder_time, timezone, last_sent_date")
    .limit(1000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const surahCache = new Map<number, Record<string, { translation: string }>>();
  async function verseText(verseKey: string): Promise<string> {
    const [surah, ayah] = verseKey.split(":").map(Number);
    if (!surahCache.has(surah)) {
      const res = await fetch(`${SITE_URL}/data/quran/${surah}.json`);
      const ayahs: Array<{ ayah: number; translation: string }> = await res.json();
      surahCache.set(surah, Object.fromEntries(ayahs.map((a) => [String(a.ayah), a])));
    }
    return surahCache.get(surah)![String(ayah)]?.translation ?? "";
  }

  let sent = 0, pruned = 0, skipped = 0;
  for (const sub of subs ?? []) {
    const nowMin = minutesOfDayInZone(now, sub.timezone);
    const today = localDateInZone(now, sub.timezone);
    if (!isDue(sub.reminder_time, nowMin) || sub.last_sent_date === today) { skipped++; continue; }
    const verseKey = verseKeyForDayIndex(localDayIndexInZone(now, sub.timezone));
    const body = await verseText(verseKey);
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({
          title: `Today's verse — Qur'an ${verseKey}`,
          body: body.length > 240 ? `${body.slice(0, 237)}…` : body,
          url: "/checkin",
        }),
      );
      await admin.database.from("push_subscriptions")
        .update({ last_sent_date: today }).eq("endpoint", sub.endpoint);
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        pruned++;
      }
    }
  }
  return new Response(JSON.stringify({ sent, pruned, skipped }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
```

Note for the implementer: check the real shape of `/public/data/quran/{surah}.json` in the repo (`ls public/data/quran` + read one file) and adjust `verseText` parsing if it's keyed differently. Also confirm with `npx -y @insforge/cli secrets list` whether the runtime exposes `API_KEY` and `INSFORGE_BASE_URL` to functions; if the admin pattern requires `createAdminClient({ apiKey })` instead of `accessToken`, use that (both exist in the SDK — prefer `createAdminClient`).

- [ ] **Step 4: Run tests, verify PASS** — `npx vitest run functions/reminder-logic.test.ts`. The `Deno` reference is inside the handler only; if TypeScript complains under vitest, add `declare const Deno: { env: { get(k: string): string | undefined } };` at the top of the function file. Also exclude `functions/` from the app build if `tsc -b` picks it up (add to `tsconfig.json` `exclude`).

- [ ] **Step 5: Deploy, add cron secret, schedule**

```bash
openssl rand -hex 24   # → CRON_SECRET value
npx -y @insforge/cli secrets add CRON_SECRET <value>
npx -y @insforge/cli functions deploy send-reminders --file functions/send-reminders.ts --name "Send daily reminders"
npx -y @insforge/cli functions list   # expect status: active
npx -y @insforge/cli schedules create \
  --name "send-reminders-15m" \
  --cron "*/15 * * * *" \
  --url "<oss_host>/functions/send-reminders" \
  --method POST \
  --headers '{"Authorization": "Bearer ${{secrets.CRON_SECRET}}"}'
```

- [ ] **Step 6: End-to-end delivery check**

With the Task 9 subscription row set to a time inside the next 15-minute window: wait for the schedule fire (or hit the function once with `curl -X POST <oss_host>/functions/send-reminders -H "Authorization: Bearer <CRON_SECRET>"`), confirm the response counts `sent: 1`, the notification arrives on the subscribed device, and `npx -y @insforge/cli schedules logs <id>` shows a 200. Re-run: `skipped` increments (last_sent_date dedupe works).

- [ ] **Step 7: Commit**

```bash
git add functions/send-reminders.ts functions/reminder-logic.test.ts tsconfig.json
git commit -m "feat: send-reminders edge function + 15-min schedule (TDD)"
```

---

### Task 11: E2E smoke, docs, deploy config

**Files:**
- Create: `e2e/account-sync.spec.ts`, `playwright.config.ts` (if absent)
- Modify: `README.md`, spec doc (mark shipped), `ROADMAP.md`

- [ ] **Step 1: Playwright smoke test** (env-gated so CI/dev without credentials skips):

```typescript
import { test, expect } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL/E2E_PASSWORD to run");

test("sign in, write an entry, sync round-trip", async ({ page }) => {
  await page.goto("/account");
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/backed up/i)).toBeVisible({ timeout: 15_000 });

  await page.goto("/journal");
  // Adapt selectors to the real Journal page controls when implementing.
  const marker = `e2e-${Date.now()}`;
  await page.getByRole("button", { name: /new entry|write/i }).click();
  await page.getByRole("textbox").last().fill(marker);
  await page.getByRole("button", { name: /save/i }).click();

  // Second context = second device: entry must arrive via sync.
  const ctx2 = await page.context().browser()!.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto("/account");
  await page2.getByLabel(/email/i).fill(EMAIL!);
  await page2.getByLabel(/password/i).fill(PASSWORD!);
  await page2.getByRole("button", { name: /sign in/i }).click();
  await page2.goto("/journal");
  await expect(page2.getByText(marker)).toBeVisible({ timeout: 20_000 });
});
```

`playwright.config.ts` (if the repo has none): baseURL `http://localhost:4173`, `webServer: { command: "npm run build && npm run preview", port: 4173, reuseExistingServer: true }`. Create a dedicated test account (email/password) on the real backend and run once locally: `E2E_EMAIL=... E2E_PASSWORD=... npx playwright test e2e/account-sync.spec.ts`. Expected: PASS.

- [ ] **Step 2: Docs**

- README: new "Accounts & sync (v1)" section — env vars table (`VITE_INSFORGE_URL`, `VITE_INSFORGE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`), backend setup pointer (`migrations/`, `functions/`), the local-first merge story in three sentences, and the Vercel note below.
- ROADMAP.md: mark v1 rows 1, 2, 4 as shipped (mirror the v0 table style); leave billing marked blocked on the translation license.

- [ ] **Step 3: Vercel deploy config (user-visible checklist)**

Vercel dashboard → project → Environment Variables: add the three `VITE_*` values for Production + Preview, then redeploy. (Cannot be done from the CLI here without the user's Vercel auth — list it in the final report if not already configured.)

- [ ] **Step 4: Full verification pass**

Run: `npm run test` (all vitest green), `npm run build` (clean), `npx playwright test` (smoke passes with env vars). Manual device matrix for push per spec: Android Chrome, desktop Chrome/Edge, iOS installed PWA — record results in the final report.

- [ ] **Step 5: Commit**

```bash
git add e2e playwright.config.ts README.md ROADMAP.md docs
git commit -m "feat: e2e sync smoke test + v1 docs and roadmap update"
```
