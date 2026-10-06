# React Native app — design

**Date:** 2026-09-22
**Status:** Approved for planning
**Roadmap row:** v1 #5 — React Native app (was Deferred)

## Context and decision record

The roadmap gates this row on "v1 validated on web." That gate is **not** met:
v1 shipped 2026-09-15, the Day-7 bar (≥25–30% return on 50+ non-friend users
within ~4 weeks) has no data yet, and on 2026-09-17 `push_subscriptions` held a
single row — the developer's own device.

This was raised and **the bar was explicitly retired for this decision** by the
project owner on 2026-09-22. The port proceeds on that instruction. Recorded
here so a later reader knows the gate was considered, not overlooked.

Supporting argument: app stores are a distribution channel, and the roadmap
names distribution ("50 honest non-friend testers") as the actual bottleneck.
The Play internal-testing track is the fastest route to testers.

### Decisions taken

| Question | Decision |
| --- | --- |
| Fate of the web PWA | Both live; monorepo with a shared core |
| Offline data | Bundle all ~16MB in the binary |
| v1 native scope | Core loop first, deferred screens follow |
| First store | Android first, iOS right after |
| Execution order | Spike first (Phase 0), then extract |

## The two findings that shape the design

**1. Core logic is synchronously coupled to `localStorage`** across
`journal.ts`, `progress.ts`, `sync/engine.ts`, `syncFlags.ts` and
`analytics.ts` (~35 references; `types.ts`'s two are comments, and `theme.ts`'s
two stay platform-side). `getEntries()` returns
`JournalEntry[]`, not a promise. `AsyncStorage` would force `async` through
every function and consumer and invalidate the 47 passing tests.
`react-native-mmkv` is synchronous (JSI), so a `localStorage`-shaped shim lets
the core port unchanged. This is the decision the whole plan rests on.

**2. The Qur'anic font ships as `.woff2`, which React Native cannot load.**
`public/fonts/uthmanic-hafs.woff2` (86K) needs its `.ttf`/`.otf` original.
Complex Arabic shaping — tashkeel positioning, Hafs ligatures — is historically
where RN on Android breaks. For a Qur'an app this is a kill risk, so it is
gated before any refactor begins.

## Effort reality

~5,000 LOC of web-specific view code (14 pages + 4 components) cannot be
reused. ~1,500 LOC in `src/lib/` can. The view layer is the cost; the shared
core is the saving.

---

## Phase 0 — the spike (~1 day, throwaway)

A bare Expo app **outside** the monorepo, deleted afterwards. Nothing in
`MindfulVerse/` changes during Phase 0. Output is a written go/no-go, not code
that is kept. All gates verified on a **real Android device** — emulators do
not settle text shaping.

**Gate 1 — Arabic rendering.** Recover KFGQPC Hafs `.ttf` (from `QUL copy/` or
the KFGQPC release), load via `expo-font`, render Al-Fatiha and Al-Baqarah 255.
*Pass:* tashkeel on correct base letters, ligatures form, no tofu, no
word-splitting at line breaks — compared side by side against the live web app
on the same device.
*Fail:* STOP. Reopen the decision. Fallbacks (SVG text, bitmap Arabic) are
expensive enough to change the recommendation.

**Gate 2 — synchronous storage.** Drop in unmodified `journal.ts` and
`syncFlags.ts` over a `react-native-mmkv` shim exposing
`getItem`/`setItem`/`removeItem`. Run `merge.test.ts` and `syncFlags.test.ts`.
*Pass:* green with **zero** edits to the source files.

**Gate 3 — notification delivery.** One FCM push via `expo-notifications`,
carrying the payload shape `send-reminders` already builds, deep-linking to
`/tadabbur/{n}?v={ayah}`.
*Pass:* arrives with the app backgrounded; deep link routes correctly.

**Measured in the same session (not gates):** app size and cold start with 16MB
bundled; whether `@insforge/sdk` runs under RN (expect
`react-native-url-polyfill` plus a storage adapter for its auth session);
whether Metro's JSON inlining forces the `expo-file-system` approach below.

---

## Phase 1 — monorepo extraction

```
packages/core/          no DOM, no react-native
  types.ts  data.ts  journal.ts  progress.ts  syncFlags.ts
  journalGroups.ts  dailyVerse.ts  analytics.ts
  sync/ engine.ts  merge.ts  insforge.ts  auth.tsx
apps/web/               today's Vite app, behaviour unchanged
apps/mobile/            Expo
```

`auth.tsx` belongs in `core`: plain React plus the InsForge client, no
`react-dom`, so both platforms share the account context.

`analytics.ts` also belongs in `core` — it carries no third-party SDK, only a
localStorage event buffer, so it ports as-is. This matters: the kill/greenlight
metrics (Day-1/3/7 return, session completion, `intent_pay_tap`) are then
measured identically on both platforms instead of web-only. The Vercel
dependency is just `inject()` in `main.tsx`, which stays in `apps/web`.

Staying platform-side: `theme.ts` (`document.documentElement`), `share.ts`
(`navigator.share`), `push.ts` (web-push), `sw.ts`, and Vercel's `inject()`.

`packages/core/tsconfig.json` sets `"lib": ["ES2022"]` with **no `"DOM"`**, so a
stray `document.` reference fails the build rather than reaching a device.

### The platform seam

Principle: **polyfill where a web standard exists, inject where one does not.**

*Storage — polyfill.* `apps/mobile` installs a `globalThis.localStorage` shim
over MMKV at startup, before any core module is imported. Every core call site
and all 47 tests remain byte-identical.

*`crypto.randomUUID` — polyfill.* `journal.ts:44` uses it and Hermes does not
provide it. `expo-crypto` backs a shim installed alongside the storage one.

*Sync triggers — inject.* **`sync/engine.ts` does not port unchanged.** It
carries five web-global references: `navigator.onLine` (lines 99, 201),
`window.addEventListener("online")` (line 230) and
`document.addEventListener("visibilitychange")` / `document.visibilityState`
(lines 231–232). The merge and sync logic above them is fully portable; only
the trigger wiring is platform-specific. Phase 1 therefore extracts a small
trigger adapter — `onOnline(cb)` and `onForeground(cb)` — implemented with
`window`/`document` on web and `NetInfo`/`AppState` on native. This is the one
place the core needs real surgery rather than a polyfill, and it is confined to
roughly five lines plus an interface.

*Data loading — inject.* Web `fetch`es `/data/quran/2.json`; native reads a
bundled asset. No standard to polyfill, so `data.ts` takes a loader at
configure time and keeps its eight typed functions unchanged:

```ts
let readJson: (path: string) => Promise<unknown>;
export function configureData(fn: typeof readJson) { readJson = fn; }
```

*Native data delivery.* Metro inlines `require`d JSON into the JS bundle; 11MB
of tafsir there would wreck cold start. Native therefore ships data via
`assetBundlePatterns` and reads it with `expo-file-system` — files stay on disk
and load lazily per surah, mirroring web's existing behaviour.

---

## Phase 2 — native app

**Navigation: Expo Router**, chosen for deep links. File routes mirror the web
paths, so the existing push payload resolves with no change.

```
app/_layout.tsx          configure(storage, data) + expo-font + AccountProvider
app/(tabs)/              index (Home) · read · journal · account
app/read/[surah].tsx     ← /read/:surah
app/tadabbur/[surah].tsx ← /tadabbur/:surah?v=   (reminder target)
app/checkin.tsx          pushed from Home
```

Bottom tabs replace the desktop sidebar.

**In scope:** Home, daily check-in, reader (surah + Arabic-only toggle), surah
tadabbur, journal, account/sync/reminders.

**Deferred to fast follow:** Sessions, SessionPlayer, Search, Themes, Dhikr,
Stats.

---

## Phase 3 — backend

One additive migration: `push_subscriptions` gains
`platform text not null default 'web'`. Existing rows keep working untouched;
native rows store the Expo push token in the existing `endpoint` primary key.

`send-reminders` branches **at the send step only** — web-push/VAPID as today,
Expo Push API otherwise. The cron, the 15-minute window, `pickContinueTarget()`
and `last_sent_date` are shared and unchanged, so the 13 existing
`reminder-logic.test.ts` cases continue to cover both platforms.

---

## Testing

- `packages/core` keeps vitest; its 47 tests run once and protect both apps.
  This is the main structural payoff of the extraction.
- Playwright e2e stays pointed at `apps/web`.
- Native: device smoke-testing against the Gate 3 checklist. No RN e2e harness
  in v1 (YAGNI — add when there is a second developer).
- Regression bar for Phase 1: web behaviour unchanged, full suite green before
  any native view work begins.

## Error handling

Unchanged from web, and deliberately so: sync failures set status and retry on
the next trigger, never surfacing as exceptions to callers; the account-owner
guard still yields `switched-account`; storage writes that throw are swallowed
so a full disk degrades to a full-diff sync rather than data loss. The MMKV
shim must preserve these throw semantics — it may not throw where
`localStorage` would silently fail.

## Rollout

EAS Build → Play Console **internal testing** track: testers install by link,
no review wait, updates in hours. iOS/TestFlight once the loop is stable on
Android. `apps/web` continues deploying to Vercel; the monorepo move changes
its root-directory setting and nothing else.

## Out of scope for v1 native

Billing/IAP (blocked on a commercial-safe translation licence regardless —
Apple 3.1.1 would also take 15–30%), recitation audio, Hausa/Yoruba, and the
five deferred screens.

## Planning sequence

This spec covers four phases, but they are **not** planned as one unit. Phase 0
ends in a hard stop gate, and detailed plans for Phases 1–3 written before that
gate would be discarded if Gate 1 fails.

So: write the implementation plan for **Phase 0 only**. On a go, plan Phase 1
(extraction) — which is independently valuable to the web app regardless of
native — then Phases 2 and 3.

## Open risks

1. **Gate 1 is a genuine stop.** If Hafs will not shape correctly on Android,
   the port's premise fails and the decision reopens.
2. **`@insforge/sdk` under RN is unproven here.** Measured in Phase 0; if it
   needs more than polyfills, Phase 1 grows an adapter.
3. **Two notification stacks to keep alive.** Mitigated by branching only at
   the send step.
4. **The retired gate.** Distribution, not platform, remains the stated
   bottleneck; the native app does not by itself produce testers.
