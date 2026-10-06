# @mindfulverse/mobile

The MindfulVerse Android app (iOS later). Expo SDK 57, React Native 0.86,
React 19, Expo Router, TypeScript. It shares `packages/core` with the web app.

Architecture and conventions for screen work:
[`docs/superpowers/plans/2026-10-06-rn-phase2-mobile.md`](../../docs/superpowers/plans/2026-10-06-rn-phase2-mobile.md).

## Setup

From the repo root:

```bash
npm install                                  # installs every workspace
cp apps/mobile/.env.example apps/mobile/.env # then fill in the two values
```

### Environment

| Var | What |
| --- | --- |
| `EXPO_PUBLIC_INSFORGE_URL` | InsForge API base (same value as the root `.env`'s `VITE_INSFORGE_URL`) |
| `EXPO_PUBLIC_INSFORGE_ANON_KEY` | InsForge anon key (same as `VITE_INSFORGE_ANON_KEY`) |

`apps/mobile/.env` is gitignored. Expo inlines `EXPO_PUBLIC_*` values into the
JS bundle at build time, so they are public by design. Never put a secret there.
To fill `.env` from the root file without printing the values:

```bash
sed -n -E 's/^VITE_INSFORGE_URL=/EXPO_PUBLIC_INSFORGE_URL=/p; s/^VITE_INSFORGE_ANON_KEY=/EXPO_PUBLIC_INSFORGE_ANON_KEY=/p' .env > apps/mobile/.env
```

For EAS cloud builds, set the same two vars as EAS environment variables
(`eas env:create`), because `.env` is not uploaded.

## Bundled data (`sync-data`)

The app ships all of `apps/web/public/data` (349 JSON files, about 16MB) inside
the APK and reads it lazily per file. It is not duplicated in git:

```bash
npm run sync-data -w @mindfulverse/mobile
```

This copies the data to `apps/mobile/assets/data/` (gitignored) as `*.mvdata`
files and writes `assets/data/manifest.js`. **You rarely need to run it by
hand.** `metro.config.js` runs it whenever the copy is missing or older than
the source. Every bundling path loads that config: `expo start`, `expo export`,
and the Gradle release task's `expo export:embed`. EAS also runs it through
the `eas-build-post-install` hook.

After regenerating the web data (`npm run build:data` at the root), the next
Metro start picks the change up on its own.

## Run (development)

MMKV (`react-native-mmkv` v4 + `react-native-nitro-modules`) is a native
module, so **Expo Go is not enough**. In Expo Go, storage falls back to memory
(`storageBackend === "memory"`, shown on the Account placeholder) and nothing
survives a restart. Use a **development build**:

```bash
# Local, needs Android Studio (SDK + platform tools) and a device or emulator:
npm run android -w @mindfulverse/mobile         # expo run:android: prebuild + gradle + install

# Or in the cloud (needs `eas login` and `eas init`, see Push below):
npx eas build --profile development --platform android   # from apps/mobile
```

Then `npm run start -w @mindfulverse/mobile` serves JS to the installed dev
client. Native changes (new native module, app.json plugin changes) need a new
dev build. JS changes don't.

## Build for Android

| Goal | Command (from `apps/mobile`) |
| --- | --- |
| Release APK, locally | `npx expo run:android --variant release` |
| Native project only | `npm run prebuild:android` (writes the gitignored `android/`) |
| Testers (internal APK) | `npx eas build --profile preview --platform android` |
| Play internal track (AAB) | `npx eas build --profile production --platform android`, then `npx eas submit -p android` |

App id `dev.mindfulverse.app`, deep-link scheme `mindfulverse://`.

## Checks

```bash
npm run typecheck -w @mindfulverse/mobile      # tsc --noEmit (strict)
npm run export:android -w @mindfulverse/mobile # expo export with asset map + source maps
npm run check:bundle -w @mindfulverse/mobile   # one React copy, data as assets, bundle size
npm run doctor -w @mindfulverse/mobile         # expo-doctor
```

`expo-doctor` reports one known, accepted failure: "duplicate dependencies:
react 19.2.3 / 18.3.1". The web app is on React 18, which npm hoists to the
root. Metro pins React to this app's copy (see `metro.config.js`), and
`check:bundle` proves only one React is bundled. React is not a native module,
so the native build is unaffected.

## Push (daily reminders): off in this release

`src/push.ts` implements registration per the Phase 3 contract, and the EAS
project id is already in `app.json` (`extra.eas.projectId`). Firebase/FCM is
deliberately not set up yet, so `pushSupport()` returns `"not-configured"`
(it needs `expo.android.googleServicesFile` in the app config) and the
Account screen shows "Reminders aren't available in this version of the app
yet". iOS also returns `"not-configured"`; it isn't shipping yet.

To turn push on later, all of these:

1. **Firebase project:** create one with an Android app whose package is
   `dev.mindfulverse.app`, and download its `google-services.json` into
   `apps/mobile/` (keep it out of git; for EAS builds, upload it as a file
   environment variable, e.g. `GOOGLE_SERVICES_JSON`, and point the config at
   that path).
2. **App config:** add `"googleServicesFile": "./google-services.json"` under
   `expo.android` in `app.json`. This is what flips `pushSupport()` to `"ok"`,
   so it must never ship without the file. Needs a new native build.
3. **FCM V1 key:** in Firebase, create a service-account key (Project settings →
   Service accounts), then upload it with `npx eas credentials` (Android →
   production → Google Service Account → FCM V1). Expo's push service uses it to
   deliver to FCM.
4. **Backend:** apply the Phase 3 migration and redeploy the `send-reminders`
   function, as described under "Apply later" in
   `docs/superpowers/plans/2026-10-06-rn-phase3-push-platform.md`.
5. Test end to end on a device: turn the reminder on (the welcome push should
   arrive), tap it (opens `/checkin`), change the time, turn it off.

For iOS later: APNs credentials via `eas credentials`, then change
`fcmConfigured()` in `src/push.ts` to accept iOS.

## Not in scope yet

- OAuth (Google/GitHub). The SDK's PKCE needs `crypto.subtle`, which Hermes
  lacks, plus a redirect flow (`expo-web-browser`). Only email/password is wired.
- The real screens. Every route is a placeholder; see the checklist in the
  Phase 2 doc.
