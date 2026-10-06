# RN Phase 2: the mobile app foundation (as built)

**Date:** 2026-10-06
**Branch:** `feat/mobile-app`
**Spec:** `../specs/2026-09-22-react-native-app-design.md` ("Phase 2: native app")
**Inputs:** `../specs/2026-09-22-rn-phase0-findings.md` (F3, F4, F5, SDK findings),
`2026-10-06-rn-phase1-extraction.md` (the seam), `2026-10-06-rn-phase3-push-platform.md` (push contract)

This is the scaffold that screen builders work on. Every route exists, but
each one is a placeholder. The platform plumbing is finished: storage, data,
session, sync, push and theme. How to run and build it: `apps/mobile/README.md`.

## Result

| Check | Result |
| --- | --- |
| root `npm test` | 10 files, 86 tests, green (unchanged) |
| root `npm run build` | green; web `dist/` still has `sw.js` + 15 precache entries |
| `tsc --noEmit` in apps/mobile | green: strict mode, core typechecked as source, typed routes |
| `expo export --platform android` | Hermes bundle **2.83 MB**; **367 assets**, of which **349 are the data files** |
| One React (`npm run check:bundle`) | react 19.2.3, react-native 0.86.3 and scheduler 0.27.0 are each bundled once, all from `apps/mobile/node_modules`. No `18.3.1` string in the bytecode. The dev bundle served by Metro also has one React. |
| Data not inlined | The 2:255 translation text is absent from the `.hbc`. Phase 0's spike was 2.9 MB with two surahs inlined and 26 MB with all of them. A data file served by Metro is byte-identical to `public/data`. |
| `expo-doctor` | 20/21 checks pass. The one failure is "duplicate react 19.2.3 / 18.3.1", which is inherent to web on React 18 and accepted (see below). |
| Device run | **Not done.** No Android SDK on this machine yet. See "Unverified". |

## Layout

```
apps/mobile/
  app.json            name MindfulVerse, android.package dev.mindfulverse.app, scheme mindfulverse,
                      plugins (router, font, asset, secure-store, splash, notifications),
                      experiments.typedRoutes, experiments.tsconfigPaths=false (see tsconfig)
  eas.json            development (dev client APK) / preview (APK) / production (AAB → internal track)
  metro.config.js     React pinning, crypto stub, .mvdata assets, auto sync-data
  tsconfig.json       strict; paths pin React *types* to @types/react 19 (tsc only)
  .env.example        EXPO_PUBLIC_INSFORGE_URL / _ANON_KEY  (.env is gitignored)
  scripts/
    sync-data.mjs     apps/web/public/data → assets/data/**.mvdata + manifest.js (gitignored)
    check-bundle.mjs  asserts one React + data-as-assets on an export
  assets/fonts/       uthmanic-hafs.ttf (from the Phase 0 woff2 recovery), fraunces-{regular,semibold}.ttf
  assets/images/icon.png   web's icon-512
  app/                routes (below)
  src/
    setup.ts          the startup seam (first import of app/_layout.tsx)
    env.ts            EXPO_PUBLIC_* reads
    session.ts        sign-in/up/out + session persistence
    push.ts           reminder registration (Phase 3 contract)
    notifications.ts  foreground handler + tap → route
    theme.ts          tokens + ThemeProvider/useTheme
    ui/               Screen, Text, ArabicText, Button, Card (index.ts re-exports)
    platform/
      shims.ts        localStorage + crypto.randomUUID (side-effect module)
      storage.ts      MMKV-backed localStorage; `kv`, `storageBackend`
      data.ts         configureData reader (expo-asset + expo-file-system)
      syncTriggers.ts NetInfo + AppState
```

## Startup sequence

`app/_layout.tsx` runs these steps in order:

1. `import "../src/setup"` must be the **first line**, as a side-effect import (F4). Inside `setup.ts`:
   1. `./platform/shims`: `globalThis.localStorage` over MMKV (`createMMKV({ id: "mindfulverse" })`, v4 API, F3) and
      `crypto.randomUUID` over `expo-crypto`. MMKV is `require`d inside a try block: in Expo Go the native
      module is missing, so the shim falls back to an in-memory Map (`storageBackend === "memory"`).
      Semantics follow `globals.d.ts`: `getItem`/`removeItem` never throw, and `setItem` may throw.
   2. `react-native-url-polyfill/auto`: the SDK uses `URL` + `searchParams.append`. The Phase 0 probe of
      Hermes' native `URL` never ran on a device, so the polyfill stays as a safe default.
   3. `configureInsforge({ baseUrl, anonKey, isServerMode: true, auth: { detectOAuthCallback: false } })`.
      These option names were checked against `@insforge/sdk` 1.5.2 (`InsForgeConfig`, `createClient`).
   4. `configureData(readBundledJson)`, `configureAnalytics({ onTrack: __DEV__ ? console.debug : undefined })`,
      `configureSyncTriggers(nativeSyncTriggers)`.
2. Module scope of `_layout.tsx`: `SplashScreen.preventAutoHideAsync()`, `trackAppOpen()`, `recordVisit()`
   (and again on every AppState `active`, as web does on `visibilitychange`), then
   `restore().then(initSync)`. Restore starts at once, in parallel with font loading.
3. `RootLayout` renders `null` (the native splash stays up) until the fonts are loaded **and** `restore()` has settled.
   Then it renders
   `SafeAreaProvider > ThemeProvider > AccountProvider > { SessionBridge, RootNavigator }` and hides the splash.
4. `AccountProvider` (core `sync/auth.tsx`) mounts only after the restore. Its first `getCurrentUser()`
   therefore already carries the restored token.
5. `RootNavigator` mounts the Stack and `useNotificationRouting()`.

`restore()` waits at most 4 s, so a launch with no network is never held on
the splash. If the refresh lands later, `onSessionChange` fires and
`SessionBridge` calls `useAccount().refresh()`.

## Session (`src/session.ts`)

The SDK keeps tokens in memory only. Server mode (`client_type=mobile`) returns
the refresh token in the response body. Reading the SDK source turned up two
facts that shape this module:

- **In server mode, `signInWithPassword`/`refreshSession` set the HTTP bearer token but not the
  TokenManager**, and `getCurrentUser()` reads the TokenManager. On its own, AccountProvider would
  report signed-out right after a successful sign-in. Every success therefore calls
  `insforge.setAccessToken(token, event)`.
- **Server mode turns off the SDK's refresh-and-retry on a 401.** `session.ts` refreshes
  2 minutes before the JWT `exp` (on a timer), and again when the app comes back to the
  foreground if the token is near expiry or there is no session yet.

`refreshSession` sends `{ refresh_token }`. The backend accepts that key and
`refreshToken` alike; this was probed with a bogus token, and both return
401 "Invalid or expired refresh token". A rotated refresh token is persisted.
The refresh token lives in `expo-secure-store` under
`mindfulverse.refreshToken.v1`. A 401/403 on refresh forgets it. A network
failure keeps it.

API for the Account screen:

```ts
import { signIn, signUp, verifyEmail, signOut, restore, hasSession, onSessionChange } from "../src/session";

await signIn(email, password)            // → { error: string | null }
await signUp(email, password)            // → { error, needsVerification }  (backend emails a 6-digit code)
await verifyEmail(email, otp)            // → { error }
await signOut()                          // server logout (best effort) + forget the token
// after any success, do what web's Account.tsx does:
await refresh();   // from useAccount()
await syncNow();   // from @mindfulverse/core/sync/engine
```

Before `signOut()`, call `unregisterPush(user.id)` from `push.ts`. RLS stops
the delete once the user is signed out. **OAuth is out of scope.** PKCE needs
`crypto.subtle` (Hermes has none) and a redirect flow (`expo-web-browser`).
Hide the Google/GitHub buttons on native for now.

## Data delivery (`sync-data` + `src/platform/data.ts`)

Requirement: ship ~16 MB in the APK, read it lazily per file, keep it out of the
JS bundle, and keep it out of git.

**Chosen: Metro assets with a custom extension, resolved by expo-asset, read by expo-file-system.**

- `scripts/sync-data.mjs` copies `apps/web/public/data/**.json` to `assets/data/**.mvdata` (gitignored).
  It also writes `assets/data/manifest.js`, which maps each core path to its asset:
  `{ "quran/2.json": require("./quran/2.mvdata"), … }`.
- `metro.config.js` adds `mvdata` to `assetExts`. Each file becomes an asset, so the bundle carries
  only a ~100-byte `registerAsset` stub per file, not its contents. A plain `.json` can't be used: Metro
  inlines JSON, and `json` can't move to `assetExts` because packages `require` their own JSON.
- Release Android: the RN Gradle task (`expo export:embed`) copies non-image assets into `res/raw`.
  `Asset.fromModule(id).downloadAsync()` then copies the raw resource into the cache dir once
  (`ExpoAsset` native `openAssetResourceStream` → `openRawResource`), and
  `new File(localUri).text()` reads it. Dev builds take the same code path, except the "download"
  fetches from Metro. Core's `data.ts` caches each parsed result per path.
- `metro.config.js` runs `sync-data` itself when `assets/data/manifest.js` is missing or older than
  any source file. Every bundling path loads that file (start, export, and the Gradle `export:embed`),
  so "run before android builds" happens automatically. EAS also has an
  `eas-build-post-install` hook. `npm run sync-data -w @mindfulverse/mobile` runs it by hand.

Alternatives considered:

- `assetBundlePatterns`: a no-op in modern Expo, since it only fed classic updates.
- `expo-asset`'s config plugin (`assets: [...]`): it flattens directories, keeping only the basename, so
  `quran/2.json` and `tafsir/2.json` would collide. It also targets `android/app/src/main/assets`,
  which expo-file-system can't read by path.
- A custom config plugin that copies into native `assets/` plus an `AssetManager` reader: this would
  need a native module, which is more code with no gain.

**Cost:** the first read of each file costs one copy into the cache. Android
may evict the cache, in which case the next read copies again.

## Monorepo: one React

Web pins React 18, which npm hoists to the root. Mobile needs React 19.2.3,
which npm nests in `apps/mobile/node_modules` (expo and react-native nest with
it). `packages/core/sync/auth.tsx` and hoisted packages such as `react-freeze`
and `use-latest-callback` would otherwise resolve the root React 18.

- **Runtime:** `metro.config.js` `resolveRequest` resolves `react`, `react-native`, `scheduler` and
  `@insforge/sdk` (plus their subpaths) as if imported from `apps/mobile`. Finding: Expo SDK 57's
  autolinking module resolution, on by default, already makes react and react-native "sticky". With the
  rule disabled, a test export produced the same bundle hash. The explicit rule stays as the guarantee
  and also covers `scheduler`. `npm run check:bundle` is the regression check.
- **Types:** `tsconfig.json` `paths` maps `react` and `react/*` to `apps/mobile/node_modules/@types/react` (19).
  Metro honours tsconfig `paths` by default, and would then try to bundle `@types/react`. `app.json`
  therefore sets `experiments.tsconfigPaths: false`, which means **there is no `@/` import alias.
  Use relative imports.**
- `expo-doctor`'s duplicate-react warning is expected. React isn't a native module, and the bundle check
  shows one copy. It clears once web moves to React 19.

## Routing

```
app/_layout.tsx            setup import, fonts, restore, providers, Stack
app/(tabs)/_layout.tsx     bottom tabs: index (Home) · read · journal · account
app/(tabs)/index.tsx       /              Home        ← web pages/Home.tsx
app/(tabs)/read.tsx        /read          surah list  ← web pages/Reader.tsx
app/(tabs)/journal.tsx     /journal                   ← web pages/Journal.tsx
app/(tabs)/account.tsx     /account                   ← web pages/Account.tsx
app/read/[surah].tsx       /read/:surah   reader      ← web pages/Surah.tsx
app/tadabbur/[surah].tsx   /tadabbur/:surah?v=        ← web pages/SurahTadabbur.tsx (reminder target)
app/checkin.tsx            /checkin                   ← web pages/CheckIn.tsx (pushed from Home; daily-verse push target)
app/+not-found.tsx
```

Paths mirror web's, so a push `data.url` is a router path as-is. Typed routes
are on. Read params with
`useLocalSearchParams<{ surah: string; v?: string }>()`. Values are strings,
so convert with `Number()`. Set titles per screen with
`<Stack.Screen options={{ title }} />`. Header styling comes from the root Stack.

## Push and notifications

- `src/notifications.ts` sets the foreground handler at import, using `shouldShowBanner`/`shouldShowList`
  (F5). `useNotificationRouting()` handles the cold start (`getLastNotificationResponse()`) and
  warm taps (`addNotificationResponseReceivedListener`). Taps are de-duplicated by request
  identifier. Only in-app paths (`/…`) are accepted.
- `src/push.ts` mirrors web's `lib/push.ts`: `pushSupport()`, `getReminder()`,
  `enableReminder(time)`, `updateReminderTime(time)`, `disableReminder()`, plus
  `unregisterPush(userId)`. Rows follow the Phase 3 contract: `endpoint` is the Expo token,
  `platform: 'expo'`, `user_id`/`keys` are omitted, and `send-reminders` is invoked for the welcome
  push. The token is cached in localStorage, so reads don't prompt for permission. The Android
  channel is `default`, because `send-reminders` sets no `channelId`.
- **Not runnable yet.** There is no EAS project id: `pushSupport()` returns `"no-project"` and
  `enableReminder` returns a clear error. There is no `google-services.json` or FCM key, and the
  Phase 3 migration is not applied. README "Push" lists the steps. The Account screen should show
  the reminder control only when `pushSupport() === "ok"`.

## Conventions for screen builders

1. **File ownership.** Each screen agent owns its route file(s) under `app/` and may add
   `src/components/<Screen>/…`. Don't edit `app/_layout.tsx`, `src/setup.ts`, `src/platform/*`,
   `metro.config.js` or `app.json` without coordinating. Add shared primitives to `src/ui/` only when a
   second screen needs them.
2. **Theme.** Use `const { colors, scheme } = useTheme()` from `src/theme.ts`. Never hard-code hex
   values. Tokens match web's CSS vars, in camelCase: `cotton` (page), `cottonRaised`, `shea` (cards),
   `indigo` (actions/links), `indigoDeep` (headings/Arabic), `indigoWash`, `kola` (rare accent),
   `ink`, `inkSoft`, `inkFaint`, `line`, `lineStrong`. Spacing comes from `space`
   (xs 4, sm 8, md 16, lg 22, xl 32, xxl 40), and radii from `radius`. The theme preference matches
   web: user-controlled, default light, key `mindfulverse.theme.v1`. Native also accepts `"system"`.
   Use `setPref` to build the toggle.
3. **Primitives** (`import { Screen, Text, ArabicText, Button, Card } from "../src/ui"`):
   - `Screen`: page container with safe area, 22 dp gutters and a 16 dp gap between children. Use
     `edges="bottom"` under a Stack header and `scroll={false}` when you bring a `FlatList`. **Use
     `FlatList` for long surahs and journal lists**; don't put 286 ayahs in a ScrollView.
   - `Text variant=`: `body` | `soft` | `muted` | `eyebrow` | `h1` | `h2` | `translation`, with an
     optional `scale`.
   - `ArabicText scale=`: Hafs font, right-aligned RTL, line height 2.3× (so tashkeel isn't clipped).
     **Never** set `letterSpacing` on Arabic. Pass `scaleFor(getSizeKey())` from
     `@mindfulverse/core/readingPrefs`.
   - `Button kind=`: `primary` | `secondary` | `ghost`, with `busy`. Wrap it in `<Link asChild>` for
     navigation.
   - `Card`: shea block, 22 dp padding.
   - Fonts: `fonts.read` (Fraunces 400), `fonts.readSemiBold` (600) and `fonts.arabic`. Pick the weight
     with the family; `fontWeight` doesn't select a weight of a custom font on Android. The Fraunces TTFs
     cover Latin only (web's PDF subset). Android falls back to the system font per glyph for anything
     else.
4. **Data.** Call core's loaders exactly as web does: `loadSurahs()`, `loadSurahAyahs(n)`,
   `loadSurahTafsir(n)`, `loadSurahInfo(n)`, `loadThemes()`, `loadEmotions()`, `loadDivisions()`,
   `loadAyah(s, a)`, `loadAyahsByKeys(keys)`, `loadSessions()` and `loadSearchIndex()`, all from
   `@mindfulverse/core/data`. They're async: handle loading and error states. Never `require()` or
   `import` a JSON file from `assets/data` or `apps/web/public/data`, because Metro would inline it.
   The first read of a file in a session costs one file copy. Prefetch `surahs.json` on Home if needed.
5. **Journal and progress** are synchronous over MMKV, exactly as on web. Use `getEntries()`,
   `addEntry({...})`, `deleteEntry(id)` and `checkedInToday()` from `@mindfulverse/core/journal`;
   `groupEntries` from `journalGroups`; and `recordLastRead`, `getLastRead`, `recordSurahTadabbur`,
   `getSurahTadabbur`, `latestSurahTadabbur`, `currentStreak` and friends from
   `@mindfulverse/core/progress`. Writes mark the store dirty, and the sync engine pushes them
   (debounced 3 s; also on reconnect and foreground). Nothing is reactive: re-read on focus with
   `useFocusEffect` from expo-router. `JOURNAL_SAVED_EVENT` is not delivered on native (F1 guard),
   so don't rely on it.
6. **Account and sync.** Use `useAccount()` (`user`, `loading`, `refresh`) from
   `@mindfulverse/core/sync/auth`; `getSyncStatus`, `onSyncStatus`, `statusLabel`, `syncNow` and
   `resolveOwnerMismatch` from `@mindfulverse/core/sync/engine`; and `src/session.ts` for auth calls
   (see above). Keep web's error-handling stance: sync failures show status, never exceptions.
7. **Analytics.** Use `track({...})` from `@mindfulverse/core/analytics`, with the same event names as
   web, so the kill/greenlight metrics compare across platforms.
8. **No DOM.** Don't use `window`, `document` or `navigator` APIs. For share, use RN `Share`. For
   confirm dialogs, use `Alert.alert` instead of `window.confirm`.
9. **Checks before you hand off:** `npm run typecheck -w @mindfulverse/mobile`, root `npm test`, and,
   if you touched imports or assets, `npm run export:android && npm run check:bundle`
   (`-w @mindfulverse/mobile`).

## Screens still to build

In scope for v1 (spec):

- [ ] **Home** (`app/(tabs)/index.tsx`): daily verse (`todayVerseKey` + `loadAyahsByKeys`), a "continue"
      card (`getLastRead`/`latestSurahTadabbur`), the check-in prompt (`checkedInToday`), and the streak.
- [ ] **Check-in** (`app/checkin.tsx`): emotions (`loadEmotions`) → verse → reflection → `addEntry`
      with `context.kind = "checkin"`.
- [ ] **Read: surah list** (`app/(tabs)/read.tsx`): `loadSurahs()`. The juz tab (`loadDivisions`) is optional for v1.
- [ ] **Reader** (`app/read/[surah].tsx`): `FlatList` of ayahs, translation/reading view and size
      (`readingPrefs`), `recordLastRead` on scroll (web uses an IntersectionObserver; use `onViewableItemsChanged`),
      and a verse sheet with tafsir.
- [x] **Surah tadabbur** (`app/tadabbur/[surah].tsx`): resume at `?v=`, `recordSurahTadabbur`, and the
      reflection → `addEntry`.
- [ ] **Journal** (`app/(tabs)/journal.tsx`): `groupEntries(getEntries())`, delete. Export/PDF are deferred
      (`journalExport` is still web-only).
- [ ] **Account** (`app/(tabs)/account.tsx`): email/password sign-in/up and the OTP step (`session.ts`), sync
      status, account-switch resolution, reminder toggle and time (`push.ts`, shown only when
      `pushSupport() === "ok"`), sign-out (unregister push first), delete-my-data, theme toggle.

Deferred (fast follow, per spec): Sessions, SessionPlayer, Search, Themes, Dhikr, Stats, Juz reader.

Platform follow-ups:

- [ ] Device run: Gate 1 (Hafs shaping) and Gate 2b (MMKV) on a real phone; the reminder deep link.
- [ ] EAS project (`eas init`), Firebase/FCM, and applying Phase 3. Then test push end to end.
- [ ] Adaptive icon: the web icon is full-bleed, so the diamond's corners sit outside the 66 % safe zone.
      Make a padded foreground.
- [ ] Tab icons are placeholder glyphs. Pick an icon set.
- [ ] OAuth on native (subtle-crypto polyfill + `expo-web-browser` redirect).

## Unverified (needs the emulator or a device)

- The data read path in a **release** APK (`res/raw` → cache → `File.text()`). It follows expo-asset's
  documented native path, which has been read through; but it has not been executed.
- Whether Hermes' native `URL` would work without the polyfill (it's installed anyway).
- Session restore against a real account: `signIn`, kill the app, relaunch, and check it is still signed in. This
  depends on `setAccessToken` filling the TokenManager in server mode, as read from the SDK source.
- Fraunces and Hafs rendering on Android, and cold start time.

## Tadabbur notes

`app/tadabbur/[surah].tsx` + `src/components/Tadabbur/` (branch `feat/mobile-tadabbur`).

- **Same flow as web**: about screen (Ibn Kathir intro, "Read more" after 5 paragraphs) → one verse per
  step → completion. Same copy, `session_start` (`surah-{n}`, once), `journal_save` (`tadabbur`),
  `recordSurahTadabbur` (furthest verse), resume offer from `getSurahTadabbur`, same journal entry
  (`Tadabbur on {key}`, `Lessons:/Reflection:/Action:`, `context.kind = "tadabbur"`).
- **`?v=`**: honoured once the surah has loaded (cold start shows "Opening the surah…" first). Each new
  `v` value is honoured once, so a second reminder tap while the screen is open jumps too.
  Invalid/out-of-range `v` opens the about screen, as on web.
- **Reflection inputs** own their state (keyed per verse); the screen mirrors drafts in a ref, so
  typing never re-renders the verse. The focused input is scrolled above the keyboard
  (`KeyboardAvoidingView` padding + `measureLayout` on `keyboardDidShow`). `addEntry` is wrapped:
  a failed MMKV write keeps the draft and says so. Nothing listens for `JOURNAL_SAVED_EVENT`.
- **Leaving with an unsaved reflection** (header back, Android back, Next surah) asks via
  `Alert` (`usePreventRemove`), instead of web's "tap All tadabbur again" line.
- **Additions over web**: "Go to a verse" bottom sheet (Modal, FlatList with fixed-height memoized
  rows, opens at the current verse) for long surahs; a Share action (RN `Share`, web's text,
  `share_verse` with `where: "tadabbur"`); "Try again" on the load error; Arabic follows the
  reader's size key.
- **Differs**: no `/sessions` route on mobile, so "All tadabbur"/"Back to tadabbur" become the header
  back and "Go back"/"Done" (`router.back()`, or Home when the stack has nothing behind).
- Pure logic (`logic.ts`) is covered by `logic.test.ts` in the root vitest run.
- Shared follow-ups: `verseShareText` duplicates web's `lib/share.ts`, and `Sheet.tsx` is local; move
  both to core / `src/ui` when the Reader's verse sheet needs them.

