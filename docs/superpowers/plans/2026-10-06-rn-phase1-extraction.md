# RN Phase 1 — monorepo extraction (as executed)

**Date:** 2026-10-06
**Branch:** `feat/mobile-app`
**Spec:** `../specs/2026-09-22-react-native-app-design.md` ("Phase 1 — monorepo extraction")
**Findings applied:** `../specs/2026-09-22-rn-phase0-findings.md` F1 (journal event), F2 (test count), F4 (side-effect setup import)

## Result

| | Before (main) | After |
| --- | --- | --- |
| `npm test` | 7 files, 62 tests, green | 9 files, 69 tests, green (62 original + 7 new seam tests) |
| `npm run build` | green, `dist/` with `sw.js` + 15 precache entries | green, `apps/web/dist/` with the same file set, `sw.js` + 15 precache entries |
| Rendered pages | — | 19 routes rendered side by side against main (dev and production preview): identical text, no page errors |
| `npm run test:e2e` | skips (no `E2E_EMAIL`/`E2E_PASSWORD`) | same: webServer builds and serves `apps/web`, the one spec skips |

## Layout

```
package.json          npm workspaces root ["apps/*", "packages/*"]; scripts delegate
vitest.config.ts      one run over packages/*, apps/*/src, functions/
vercel.json           framework vite, buildCommand "npm run build", outputDirectory apps/web/dist
packages/core/        @mindfulverse/core — TS source, consumed via package "exports"
  types data journal progress syncFlags journalGroups dailyVerse analytics
  divisions readingPrefs
  sync/ engine merge insforge auth.tsx
  globals.d.ts        the host globals core needs (see below)
  tsconfig.json       lib ES2022, types [], tests excluded: the no-DOM guard
  tsconfig.test.json  tests, with DOM lib (they run under node + stubs)
apps/web/             the Vite app, moved with git mv; public/, e2e/, playwright.config.ts
  src/setup.ts        installs every seam; first import in main.tsx (F4)
  src/platform/       data.ts (fetch reader), syncTriggers.ts (window/document)
  src/lib/            push, theme, share, journalExport, journalPdf,
                      useLastReadTracker, useShareFeedback, divisions.data.test
```

### What went where, and why

- **Core, beyond the spec's list:** `divisions.ts` (pure helpers) and
  `readingPrefs.ts` (localStorage plus `track`, no DOM; the native reader needs
  the same view/size preferences).
- **Stayed in web:** `theme.ts` (`document.documentElement`), `share.ts`
  (`navigator.share`/clipboard), `sync/push.ts` → `lib/push.ts` (service worker,
  Web Push, `import.meta.env`), `journalPdf.ts` (canvas, `document.fonts`,
  pdf-lib), `journalExport.ts` (pure shaping, but it ships alongside `saveFile`,
  which uses `File`/`<a download>`; split it when native export is built),
  `useLastReadTracker.ts` (IntersectionObserver, `document.querySelectorAll`),
  `useShareFeedback.ts` (wraps `share.ts`).
- **`divisions.data.test.ts` stayed in web.** It checks `apps/web/public/data`
  itself, not core logic. `divisions.test.ts` moved to core and reads the same
  JSON at `../../apps/web/public/data/`.
- **Core is consumed as TypeScript source.** Each module is one explicit
  subpath export (`@mindfulverse/core/sync/engine` → `./sync/engine.ts`).
  Vite, vitest and `tsc` (bundler resolution) resolve it with no build step.
  Explicit subpaths rather than a barrel, so that importing `types` never pulls in
  React or the InsForge SDK.
- **The no-DOM guard runs on every build.** Web's `tsc -b` typechecks core files
  *with* DOM, as part of web's program, so the root `build` runs
  `npm run typecheck -w @mindfulverse/core` first. A stray
  `document`/`window`/`navigator` fails there (checked by hand).
- **`.env` stays at the repo root.** `apps/web/vite.config.ts` sets
  `envDir: "../.."`, so no secret files moved.
- **Vercel needs no dashboard change.** It keeps building from the repo root;
  `vercel.json` now names the build command and output directory. Rewrites and
  headers are unchanged.

## The seam

Principle (from the spec): polyfill where a web standard exists, inject where
one does not. Core reads no `import.meta.env`, `window`, `document` or
`navigator`.

### Host-provided globals (polyfill)

Declared in `packages/core/globals.d.ts`. The shapes match lib.dom's, so they
merge cleanly into a DOM program.

| Global | Used by | Contract |
| --- | --- | --- |
| `localStorage` (`getItem`/`setItem`/`removeItem`) | journal, progress, syncFlags, analytics, readingPrefs, sync/engine | Synchronous. `getItem` → `null` when missing. `setItem` may throw, and callers already catch where it must not surface. |
| `crypto.randomUUID()` | journal `addEntry` | RFC 4122 v4 string |
| `setTimeout` / `clearTimeout` | sync/engine `makeDebounced` | standard |

`@insforge/sdk` brings its own needs (`fetch`, `URL`; see the Phase 0 findings).
Core's own modules do not use `fetch` or `URL`.

### Injected (configure at startup, before first use)

```ts
// @mindfulverse/core/sync/insforge
export let insforge: InsForgeClient;                       // live binding
export function configureInsforge(config: InsForgeConfig): InsForgeClient;

// @mindfulverse/core/data
export type ReadJson = (path: string) => Promise<unknown>;
export function configureData(fn: ReadJson): void;
// paths are data-root-relative: "surahs.json", "quran/2.json", "tafsir/2.json",
// "info/2.json", "themes.json", "tafsir-index.json", "search.json",
// "sessions.json", "emotions.json", "divisions.json". Results are cached per path;
// failures propagate and are not cached.

// @mindfulverse/core/sync/engine
export interface SyncTriggers {
  isOnline(): boolean;
  onOnline(cb: () => void): () => void;      // returns unsubscribe
  onForeground(cb: () => void): () => void;  // returns unsubscribe
}
export function configureSyncTriggers(t: SyncTriggers): void;

// @mindfulverse/core/analytics
export function configureAnalytics(opts: { onTrack?: (e: AnalyticsEvent) => void }): void;
```

Before configuration, `insforge` is `undefined`, data loaders reject with
`configureData() must run…`, and `syncNow()`/`initSync()` throw
`configureSyncTriggers() must run…`. `configureAnalytics` is optional.

The web wiring is in `apps/web/src/setup.ts`. It is imported as the first line
of `main.tsx`, so it runs before any other module evaluates (F4):
`configureInsforge({ baseUrl: VITE_INSFORGE_URL, anonKey: VITE_INSFORGE_ANON_KEY })`,
`configureData(fetchJson)` (`fetch("/data/" + path)` and the same error text as
before), `configureAnalytics({ onTrack: DEV ? console.debug : undefined })`, and
`configureSyncTriggers(webSyncTriggers)`.

### Other changes in core

- **F1:** `addEntry` dispatches `JOURNAL_SAVED_EVENT` only when
  `globalThis.window.dispatchEvent` and `globalThis.Event` are functions. On web
  the event still fires; a test covers both the browser and the RN shape.
- `SurahTadabbur`'s direct `fetch("/data/info/N.json")` now goes through a new
  `loadSurahInfo` loader. That is a ninth typed loader; the other eight keep their
  signatures. `SurahInfo` moved to `types.ts`.

## Notes for Phase 2 (mobile)

- Install shims before importing any core module, as the first side-effect
  import (F4): `localStorage` over MMKV and `crypto.randomUUID` over expo-crypto.
  Then call `configureInsforge({ baseUrl, anonKey, isServerMode: true,
  auth: { detectOAuthCallback: false } })`, `configureData` (expo-file-system
  reader over the bundled assets), and `configureSyncTriggers` (NetInfo/AppState).
- Session persistence (refresh token in MMKV/secure-store and
  `refreshSession` on launch) is still the app's job, per the Phase 0 findings.
  `AccountProvider`'s `refresh()` calls `insforge.auth.getCurrentUser()`, so
  restore the session before mounting it.
- Core's `react` peer range is `^18.3.1 || ^19.0.0`. Web is on 18.
- If mobile's tsconfig lacks DOM types, add `packages/core/globals.d.ts` to its
  `include` (or rely on RN's own declarations).
- Nothing in core subscribes to `JOURNAL_SAVED_EVENT` for native. If the native
  install/review prompt needs it, add a listener API to `journal.ts`.
