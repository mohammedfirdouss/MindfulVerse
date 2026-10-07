# React Native Phase 0 — findings

**Date:** 2026-09-30 (machine-side); device run pending
**Spec:** `2026-09-22-react-native-app-design.md`
**Plan:** `../plans/2026-09-22-rn-phase0-spike.md`
**Spike:** `~/Desktop/Git-projects/mv-spike/` (Expo SDK 57, RN 0.86.3, Hermes)

## Status

| Gate | Verdict | Evidence |
| --- | --- | --- |
| 1 — Arabic | **PENDING (device)** | Font recovered and verified; screen built |
| 2a — Contract | **PASS** | Core copied byte-identical (`cmp`), `tsc` clean, Metro bundles |
| 2b — MMKV | **PENDING (device)**, predicted 1 failure — see F1 | Screen built |
| 3 — Push | **PENDING (device + FCM setup)** | Routes and token screen built |

**Overall: not yet decidable.** Gate 1 is the stop gate and has not been run.

## Machine-side results

### Task 1 — font recovery: PASS
`uthmanic-hafs.woff2` → `.ttf` with fonttools: 232K, 1,412 glyphs,
`GSUB`/`GPOS`/`GDEF` present, 8/8 tashkeel codepoints, name
`KFGQPC HAFS Uthmanic Script`. Metro picks it up as an asset (237KB).

### Gate 2a: PASS
- Web suite baseline: **7 files, 62 tests, all green** (spec says 47; see corrections).
- `journal.ts`, `progress.ts`, `syncFlags.ts`, `types.ts`, `sync/merge.ts`
  copied and confirmed byte-identical with `cmp`. They typecheck under the
  Expo tsconfig and bundle for Android with zero edits.

### Metro JSON inlining: confirmed — `expo-file-system` approach is required
| Bundle | Hermes `.hbc` |
| --- | --- |
| Spike (Al-Fatiha + Al-Baqarah `require`d) | 2.9 MB |
| Spike + all 349 files of `public/data` (16 MB) `require`d | **26 MB** |

16 MB of JSON becomes ~23 MB of bytecode, evaluated at module load. The spec's
`assetBundlePatterns` + `expo-file-system` lazy-load plan stands.

### `@insforge/sdk` 1.5.2 under RN: works, but needs more than polyfills
Verified: bundles for Android; from Node with an RN-shaped `window` (no
`location`), `createClient({ isServerMode: true, auth: { detectOAuthCallback: false } })`
reaches the live backend — `getPublicAuthConfig` OK, `getCurrentUser` → null.

Needed:
1. **Metro resolver stub for `crypto`.** The SDK has `await import("crypto")`
   on a Node-only branch; Metro resolves it statically and the bundle fails.
   `metro.config.js` maps `crypto` → empty module. Build config, not an SDK patch.
2. **`react-native-url-polyfill`** — likely (SDK uses `url.searchParams.append`);
   the device probe prints whether Hermes' native `URL` works unaided.
3. **Session persistence is the app's job.** `TokenManager` is in-memory only
   and there is no storage-adapter option. Browser mode refreshes via an
   httpOnly cookie; mobile must use `isServerMode: true` (refresh token in the
   response body, `client_type=mobile`) and persist the refresh token itself
   (MMKV or `expo-secure-store`), calling `refreshSession({ refreshToken })` on
   launch. **This is the "Phase 1 grows an adapter" case of open risk #2.**
4. **OAuth needs `crypto.subtle`.** PKCE uses `crypto.subtle.digest("SHA-256")`,
   which Hermes lacks. The backend has GitHub and Google enabled. Email/password
   is unaffected; OAuth on mobile needs a subtle polyfill plus a redirect flow
   (`skipBrowserRedirect` + `expo-web-browser`).

## Findings that correct the spec

**F1 — `journal.ts:54` is a sixth web-global reference the spec missed.**
`addEntry` ends with
`if (typeof window !== "undefined") window.dispatchEvent(new Event(...))`.
On RN, `window` aliases the global, so the guard passes. RN 0.86 defines
`Event` (`setUpDOM.js`) but the global is not an `EventTarget`, so
`window.dispatchEvent` is expected to be undefined → **`addEntry` throws after
it has already persisted and marked dirty.** Gate 2b's first check should show
this; its diagnostics block prints `typeof window.dispatchEvent`. The same
`typeof window` pattern in `@insforge/sdk` is harmless (wrapped in try/catch).
*Phase 1 fix:* guard on `typeof window?.dispatchEvent === "function"`, or route
`JOURNAL_SAVED_EVENT` through the same injected adapter as the sync triggers.

**F2 — test count is 62, not 47.** The juz reading-mode work added tests. Every
"47" in the spec should read "the full suite".

**F3 — `react-native-mmkv` is v4.** API is `createMMKV({ id })` and `remove(k)`,
not v3's `new MMKV()` / `delete(k)`, and it needs `react-native-nitro-modules`
as a direct dependency for autolinking.

**F4 — "install the shim before any core import" must be a side-effect import.**
ES imports are hoisted, so a bare `installLocalStorage()` statement in
`_layout.tsx` runs *after* its sibling imports. The spike uses
`import "../src/setup"` as the first line. It happens not to matter for the
current core (no module-scope `localStorage` reads), but it will the first time
one is added.

**F5 — Expo notification handler fields.** `shouldShowAlert` is deprecated in
SDK 57; use `shouldShowBanner` / `shouldShowList`.

## Pending — device run

No Android SDK, `adb` or `eas` exists on the dev machine, so these remain.

1. **Build:** install Android Studio (SDK + platform tools) or `npm i -g eas-cli`,
   then in `mv-spike/`: `npx expo run:android` (USB device), or
   `eas build --profile development --platform android`.
2. **Gate 1** — `/arabic` vs `https://mindfulverse.vercel.app/read/1` in Chrome,
   same phone. Checklist in the plan, Task 4 Step 2. Photograph both.
3. **Gate 2b** — `/storage`. Record the count, any FAIL detail, and the four
   diagnostic lines.
4. **InsForge** — `/insforge`. Record the native-URL line and both calls.
5. **Gate 3** — Firebase project, Android app `dev.mindfulverse.spike`,
   `google-services.json` in spike root (add `"googleServicesFile":
   "./google-services.json"` under `android` in `app.json`), FCM V1 key via
   `eas credentials`, rebuild. Then the curl in the plan, Task 5 Step 5, with
   the app backgrounded.
6. **Measurements** — APK size with/without `assets/data-full/` (already copied),
   cold start by stopwatch.

Then fill in the Status table, write the overall GO / NO-GO, and delete the spike.
