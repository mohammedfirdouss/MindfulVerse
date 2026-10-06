# React Native Phase 0 Spike — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer three go/no-go questions about a React Native port of MindfulVerse — Arabic shaping, synchronous storage, and push delivery — for roughly one day of throwaway work, before any refactor of the real codebase begins.

**Architecture:** A standalone Expo app at `~/Desktop/Git-projects/mv-spike/`, entirely outside the MindfulVerse repo. It imports copies of the real `journal.ts` / `syncFlags.ts` / `merge.ts` to prove they run unmodified. It is deleted after the go/no-go is written. **Nothing inside `MindfulVerse/` is modified by this plan** except the final go/no-go document.

**Tech Stack:** Expo (dev build, not Expo Go), expo-font, react-native-mmkv, expo-notifications, expo-router, fonttools (for the font conversion).

**Spec:** `docs/superpowers/specs/2026-09-22-react-native-app-design.md`

## Global Constraints

- **Throwaway.** No code from this spike is kept. Do not import from or write into `~/Desktop/Git-projects/MindfulVerse/`.
- **Expo Go will not work.** `react-native-mmkv` and push notifications are native modules. A development build is required (`npx expo run:android`, needing a local Android SDK, or EAS).
- **Device required.** Gates 1 and 3, and half of Gate 2, are only valid on a **real Android device**. Emulators do not settle text shaping. Steps needing the device are marked **[USER]** — an agent cannot complete them.
- **Core files are copied byte-for-byte.** If a copied file needs an edit to compile, Gate 2 has failed; record it rather than fixing it.
- Font family name, exactly: `KFGQPC HAFS Uthmanic Script`.
- Push payload shape, exactly as `send-reminders` emits: `{ title: string, body: string, url: string }`.

---

### Task 1: Recover the KFGQPC Hafs TTF

React Native cannot load `.woff2`. The repo ships only `public/fonts/uthmanic-hafs.woff2` (86K) and no TTF exists locally, but woff2 is a compressed sfnt wrapper, so the original tables can be recovered losslessly — including `GSUB`/`GPOS`/`GDEF`, which are what drive Arabic shaping and tashkeel positioning.

**This conversion has been verified to work.** Expected output: 232K TTF, 1,412 glyphs, 256 Arabic codepoints, 8/8 tashkeel marks, name `KFGQPC HAFS Uthmanic Script`.

**Files:**
- Create: `~/Desktop/Git-projects/mv-spike/assets/fonts/uthmanic-hafs.ttf`
- Read-only source: `~/Desktop/Git-projects/MindfulVerse/public/fonts/uthmanic-hafs.woff2`

**Interfaces:**
- Produces: `assets/fonts/uthmanic-hafs.ttf`, consumed by Task 4.

- [ ] **Step 1: Create a venv and install fonttools**

```bash
mkdir -p ~/Desktop/Git-projects/mv-spike/assets/fonts
cd ~/Desktop/Git-projects/mv-spike
python3 -m venv .fontenv
./.fontenv/bin/pip install fonttools brotli
```

- [ ] **Step 2: Convert woff2 → ttf**

```bash
cd ~/Desktop/Git-projects/mv-spike
./.fontenv/bin/python -c "
from fontTools.ttLib import TTFont
src = '$HOME/Desktop/Git-projects/MindfulVerse/public/fonts/uthmanic-hafs.woff2'
f = TTFont(src)
f.flavor = None
f.save('assets/fonts/uthmanic-hafs.ttf')
print('converted')
"
```

- [ ] **Step 3: Verify the shaping tables survived**

```bash
cd ~/Desktop/Git-projects/mv-spike
./.fontenv/bin/python -c "
from fontTools.ttLib import TTFont
f = TTFont('assets/fonts/uthmanic-hafs.ttf')
cmap = f.getBestCmap()
assert 'GSUB' in f and 'GPOS' in f and 'GDEF' in f, 'shaping tables missing'
assert len([c for c in cmap if 0x064B <= c <= 0x0652]) == 8, 'tashkeel missing'
print('name:', f['name'].getDebugName(1))
print('glyphs:', f['maxp'].numGlyphs)
print('OK')
"
```

Expected: `name: KFGQPC HAFS Uthmanic Script`, `glyphs: 1412`, `OK`.
If `GSUB`/`GPOS` are absent, stop — the font cannot shape Arabic and Gate 1 fails before the device is involved.

---

### Task 2: Scaffold the spike app

**Files:**
- Create: `~/Desktop/Git-projects/mv-spike/` (Expo app)
- Create: `~/Desktop/Git-projects/mv-spike/assets/data/1.json` (Al-Fatiha, copied)
- Create: `~/Desktop/Git-projects/mv-spike/assets/data/2.json` (Al-Baqarah, copied)

**Interfaces:**
- Produces: a runnable dev build; `app/_layout.tsx` with expo-router; verse JSON matching the `Ayah` shape (`{surah, ayah, verseKey, arabic, translation}`).

- [ ] **Step 1: Create the Expo app**

```bash
cd ~/Desktop/Git-projects
npx create-expo-app@latest mv-spike --template blank-typescript
cd mv-spike
```

- [ ] **Step 2: Install the native dependencies**

```bash
cd ~/Desktop/Git-projects/mv-spike
npx expo install expo-font react-native-mmkv expo-notifications expo-router expo-constants expo-linking react-native-safe-area-context react-native-screens
```

- [ ] **Step 3: Copy the two surah files (read-only from the real repo)**

```bash
mkdir -p ~/Desktop/Git-projects/mv-spike/assets/data
cp ~/Desktop/Git-projects/MindfulVerse/public/data/quran/1.json ~/Desktop/Git-projects/mv-spike/assets/data/
cp ~/Desktop/Git-projects/MindfulVerse/public/data/quran/2.json ~/Desktop/Git-projects/mv-spike/assets/data/
```

- [ ] **Step 4: Enable expo-router**

Edit `package.json` so the entry point is the router:

```json
"main": "expo-router/entry"
```

Add to `app.json` under `expo`:

```json
"scheme": "mvspike",
"plugins": ["expo-router", "expo-font", "expo-notifications"]
```

- [ ] **Step 5: Build and launch on the device** **[USER]**

Connect an Android device with USB debugging enabled, then:

```bash
cd ~/Desktop/Git-projects/mv-spike
npx expo run:android
```

Expected: the app installs and opens. This is a development build — Expo Go cannot host MMKV or push.
If the Android SDK is not installed locally, use `eas build --profile development --platform android` instead and install the resulting APK.

---

### Task 3: Gate 2 — synchronous storage

Gate 2 splits in two, because `react-native-mmkv` is a native module and **cannot** run under vitest in Node.

**Gate 2a (machine, no device):** prove the core modules work against any synchronous `{getItem, setItem, removeItem}`. `src/lib/syncFlags.test.ts` already stubs exactly that shape via `vi.stubGlobal`, so this is largely established — the step below confirms it and records the result.

**Gate 2b (device):** prove MMKV satisfies that same interface, by running real assertions in-app.

**Files:**
- Create: `~/Desktop/Git-projects/mv-spike/src/storage.ts`
- Create: `~/Desktop/Git-projects/mv-spike/src/core/` (copied, unmodified)
- Create: `~/Desktop/Git-projects/mv-spike/app/storage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `installLocalStorage(): void` from `src/storage.ts`, called by Task 5's `_layout.tsx` before any core import.

- [ ] **Step 1: Run the existing suite on the real repo to confirm the baseline (Gate 2a)**

```bash
cd ~/Desktop/Git-projects/MindfulVerse && npm test
```

Expected: `Test Files 5 passed (5)`, `Tests 47 passed (47)`. Record the number. This is the figure Gate 2a preserves.

- [ ] **Step 2: Copy the core files byte-for-byte**

```bash
mkdir -p ~/Desktop/Git-projects/mv-spike/src/core/sync
cd ~/Desktop/Git-projects/MindfulVerse/src/lib
cp journal.ts progress.ts syncFlags.ts types.ts ~/Desktop/Git-projects/mv-spike/src/core/
cp sync/merge.ts ~/Desktop/Git-projects/mv-spike/src/core/sync/
```

Do not edit these files. If one fails to compile, that is a Gate 2 finding — record it.

`sync/engine.ts` is deliberately **not** copied. It references `navigator.onLine` (×2), `window.addEventListener("online")` and `document.addEventListener("visibilitychange")`, so it cannot run on RN without a trigger adapter. That is a known Phase 1 task, not a Gate 2 question — the spike tests only the storage-backed modules.

- [ ] **Step 3: Write the MMKV localStorage shim and the crypto polyfill**

`journal.ts:44` calls `crypto.randomUUID()`, which Hermes does **not** provide. Without the polyfill below, `addEntry` throws and Gate 2b fails for a reason unrelated to storage. This is a legitimate polyfill under the spec's seam principle — `crypto.randomUUID` is a web standard RN merely lacks.

```bash
cd ~/Desktop/Git-projects/mv-spike
npx expo install expo-crypto
```

Create `src/storage.ts`:

```ts
import { MMKV } from "react-native-mmkv";
import * as Crypto from "expo-crypto";

const mmkv = new MMKV({ id: "mv-spike" });

/** Installs localStorage over MMKV, plus crypto.randomUUID.
 *  MUST run before any core module is imported. */
export function installLocalStorage(): void {
  (globalThis as any).localStorage = {
    getItem: (k: string): string | null => mmkv.getString(k) ?? null,
    setItem: (k: string, v: string): void => mmkv.set(k, v),
    removeItem: (k: string): void => mmkv.delete(k),
    clear: (): void => mmkv.clearAll(),
  };

  const c = ((globalThis as any).crypto ??= {});
  if (typeof c.randomUUID !== "function") c.randomUUID = () => Crypto.randomUUID();
}
```

Record in the findings whether the polyfill was needed — it is a Phase 1 requirement, not a spike artefact.

- [ ] **Step 4: Write the in-app assertion screen (Gate 2b)**

Create `app/storage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { addEntry, deleteEntry, getEntries, getTombstones } from "../src/core/journal";
import { isDirty, clearDirty } from "../src/core/syncFlags";

type Result = { name: string; pass: boolean; detail: string };

function run(): Result[] {
  const out: Result[] = [];
  const check = (name: string, fn: () => boolean) => {
    try { out.push({ name, pass: fn(), detail: "" }); }
    catch (e) { out.push({ name, pass: false, detail: String(e) }); }
  };

  (globalThis as any).localStorage.clear();
  clearDirty();

  check("addEntry returns synchronously", () => {
    const e = addEntry({ prompt: "p", body: "b", context: { kind: "free" } });
    return typeof e.id === "string" && e.id.length > 0;
  });
  check("getEntries returns an array, not a Promise", () => {
    const r = getEntries();
    return Array.isArray(r) && typeof (r as any).then === "undefined";
  });
  check("entry persisted", () => getEntries().length === 1);
  check("write marked dirty", () => isDirty() === true);
  check("delete leaves a tombstone", () => {
    const id = getEntries()[0].id;
    deleteEntry(id);
    return getEntries().length === 0 && getTombstones().some((t) => t.id === id);
  });
  check("survives a fresh read", () => getTombstones().length === 1);

  return out;
}

export default function Storage() {
  const [results, setResults] = useState<Result[]>([]);
  useEffect(() => { setResults(run()); }, []);
  const passed = results.filter((r) => r.pass).length;
  return (
    <ScrollView style={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>
        Gate 2b — {passed}/{results.length} passed
      </Text>
      {results.map((r) => (
        <Text key={r.name} style={{ marginBottom: 8, color: r.pass ? "green" : "red" }}>
          {r.pass ? "PASS" : "FAIL"} — {r.name} {r.detail}
        </Text>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Open `/storage` on the device and record the result** **[USER]**

Expected: `Gate 2b — 6/6 passed`, with `getEntries` confirming a synchronous array.
Any failure, or any edit needed to the copied files, fails Gate 2. Record which and why.

---

### Task 4: Gate 1 — Arabic rendering (the stop gate)

The highest-risk gate. If Hafs will not shape on Android, the port's premise fails and the decision reopens.

**Files:**
- Create: `~/Desktop/Git-projects/mv-spike/app/arabic.tsx`

**Interfaces:**
- Consumes: `assets/fonts/uthmanic-hafs.ttf` (Task 1), `assets/data/1.json` and `2.json` (Task 2).

- [ ] **Step 1: Write the rendering screen**

Create `app/arabic.tsx`:

```tsx
import { useFonts } from "expo-font";
import { ScrollView, Text, View } from "react-native";
import fatiha from "../assets/data/1.json";
import baqarah from "../assets/data/2.json";

type Ayah = { surah: number; ayah: number; verseKey: string; arabic: string; translation: string };

export default function Arabic() {
  const [loaded] = useFonts({
    "uthmanic-hafs": require("../assets/fonts/uthmanic-hafs.ttf"),
  });
  if (!loaded) return <Text style={{ padding: 40 }}>Loading font…</Text>;

  const verses: Ayah[] = [
    ...(fatiha as Ayah[]),
    (baqarah as Ayah[]).find((a) => a.ayah === 255)!,
  ];

  return (
    <ScrollView style={{ padding: 20, paddingTop: 64 }}>
      {verses.map((v) => (
        <View key={v.verseKey} style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontFamily: "uthmanic-hafs",
              fontSize: 30,
              lineHeight: 64,
              textAlign: "right",
              writingDirection: "rtl",
            }}
          >
            {v.arabic}
          </Text>
          <Text style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>
            {v.verseKey} — {v.translation}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Compare against the live web app, side by side on the same device** **[USER]**

Open `/arabic` in the spike app, and `https://mindfulverse.vercel.app/read/1` in Chrome on the same phone. Check each:

- [ ] Tashkeel (fatha, kasra, damma, sukun, shadda) sit on the **correct base letters**, not drifted or stacked wrongly
- [ ] Lam-alif and other ligatures form as single glyphs
- [ ] No tofu boxes (□) anywhere
- [ ] Line breaks fall between words, never mid-ligature
- [ ] Ayah-end marks (۝) render
- [ ] Al-Baqarah 255 — the longest, most diacritic-dense verse — is correct across its full wrap

- [ ] **Step 3: Photograph both screens and record the verdict** **[USER]**

Keep the photos; they are the evidence for the go/no-go.
**Any failure stops the port.** Do not proceed to Phase 1. Record precisely which property failed — it determines whether the fallback is `react-native-svg` text, bitmap Arabic, or abandoning the port.

---

### Task 5: Gate 3 — push delivery and deep link

**Files:**
- Create: `~/Desktop/Git-projects/mv-spike/app/_layout.tsx`
- Create: `~/Desktop/Git-projects/mv-spike/app/index.tsx`
- Create: `~/Desktop/Git-projects/mv-spike/app/tadabbur/[surah].tsx`

**Interfaces:**
- Consumes: `installLocalStorage()` from Task 3.
- Produces: a printed Expo push token; a route matching the real payload's `url`.

- [ ] **Step 1: Write the root layout (installs storage before core imports)**

Create `app/_layout.tsx`:

```tsx
import { installLocalStorage } from "../src/storage";
installLocalStorage(); // MUST precede any core import

import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false,
  }),
});

export default function Layout() {
  return <Stack />;
}
```

- [ ] **Step 2: Write the home screen that prints the push token**

Create `app/index.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import * as Notifications from "expo-notifications";

export default function Home() {
  const [token, setToken] = useState("requesting…");
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return setToken("permission denied");
      const t = await Notifications.getExpoPushTokenAsync();
      setToken(t.data);
      console.log("EXPO PUSH TOKEN:", t.data);
    })();
  }, []);
  return (
    <View style={{ padding: 24, paddingTop: 64, gap: 16 }}>
      <Text selectable style={{ fontSize: 12 }}>{token}</Text>
      <Link href="/arabic">→ Gate 1: Arabic</Link>
      <Link href="/storage">→ Gate 2b: Storage</Link>
      <Link href="/tadabbur/8?v=12">→ Gate 3: deep link target</Link>
    </View>
  );
}
```

- [ ] **Step 3: Write the deep-link target route**

Create `app/tadabbur/[surah].tsx` — this path mirrors the real web route the reminder links to:

```tsx
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function Tadabbur() {
  const { surah, v } = useLocalSearchParams<{ surah: string; v?: string }>();
  return (
    <View style={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ fontSize: 22 }}>Tadabbur — surah {surah}</Text>
      <Text style={{ fontSize: 16, marginTop: 8 }}>resume at ayah {v ?? "(none)"}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Configure FCM for the project** **[USER]**

Create a Firebase project, add an Android app with the spike's package name (from `app.json` → `android.package`), download `google-services.json` into the spike root, and upload the FCM server credential to Expo:

```bash
cd ~/Desktop/Git-projects/mv-spike
eas credentials   # Android → Push Notifications → upload FCM V1 service account key
```

Rebuild after adding `google-services.json`: `npx expo run:android`.

- [ ] **Step 5: Send a push using the real payload shape** **[USER]**

Background the app first (press home), then from the laptop:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "PASTE_EXPO_PUSH_TOKEN",
    "title": "Continue your tadabbur — Al-Anfal",
    "body": "You paused at verse 11. Al-Anfal is waiting where you left off.",
    "data": { "url": "/tadabbur/8?v=12" }
  }'
```

Expected: `{"data":{"status":"ok", ...}}`.

- [ ] **Step 6: Verify arrival and routing** **[USER]**

- [ ] Notification appears in the tray with the app backgrounded
- [ ] Title and body render fully, not truncated mid-word
- [ ] Tapping it opens the app at `/tadabbur/8` showing `resume at ayah 12`

Record any failure. Note that the real `send-reminders` puts the path in a top-level `url` field; the Expo transport nests it under `data`. That mapping is a Phase 3 detail — note it, do not solve it here.

---

### Task 6: Measurements and the go/no-go document

**Files:**
- Create: `~/Desktop/Git-projects/MindfulVerse/docs/superpowers/specs/2026-09-22-rn-phase0-findings.md`

This is the only file written inside the real repo, and it is the spike's actual deliverable.

- [ ] **Step 1: Measure bundled-data cost** **[USER]**

Copy the full dataset in, rebuild, and record the APK size delta and cold-start time:

```bash
cp -R ~/Desktop/Git-projects/MindfulVerse/public/data ~/Desktop/Git-projects/mv-spike/assets/data-full
du -sh ~/Desktop/Git-projects/mv-spike/assets/data-full
cd ~/Desktop/Git-projects/mv-spike && npx expo run:android
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

Record: APK size with and without the 16MB, and cold-start seconds (stopwatch, app killed first).

- [ ] **Step 2: Check the InsForge SDK under RN**

```bash
cd ~/Desktop/Git-projects/mv-spike
npx expo install @insforge/sdk react-native-url-polyfill
```

Import the client in `app/index.tsx` and reload. Record whether it initialises, and exactly which polyfills were needed.

- [ ] **Step 3: Write the findings document**

Create `docs/superpowers/specs/2026-09-22-rn-phase0-findings.md` with:

- Verdict per gate: **PASS / FAIL**, with evidence (Gate 1's photos, Gate 2b's count, Gate 3's routing result)
- Measurements: APK size delta, cold start, whether Metro forced the `expo-file-system` approach
- InsForge under RN: works / needs polyfills / blocked
- **Overall: GO or NO-GO**, and if NO-GO, precisely what failed and which fallback it implies
- Corrections the spike found in the spec — the spec is updated from this, not the reverse

- [ ] **Step 4: Delete the spike**

```bash
rm -rf ~/Desktop/Git-projects/mv-spike
```

Only after the findings document is written. Keep the Gate 1 photos somewhere outside the deleted directory.

- [ ] **Step 5: Do not commit**

Per the project rule, plan/spec/findings documents stay local and are **not** committed to git.

---

## Gate summary

| Gate | What it proves | Who runs it | Failure means |
| --- | --- | --- | --- |
| 1 — Arabic | Hafs shapes correctly on Android | **[USER]**, device | **Stop the port** |
| 2a — Contract | Core is storage-agnostic | Agent, machine | Core needs an async rewrite |
| 2b — MMKV | MMKV backs it synchronously on device | **[USER]**, device | Core needs an async rewrite |
| 3 — Push | FCM delivers and deep-links | **[USER]**, device | Notification driver unmet; reconsider |

A NO-GO on Gate 1 ends the port. A NO-GO on Gate 2 makes it far more expensive (the ~1,500 LOC core no longer ports free). A NO-GO on Gate 3 removes one of the three stated drivers.
