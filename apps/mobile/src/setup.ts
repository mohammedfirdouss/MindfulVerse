// Installs the native implementations of the shared core's platform seams.
// Imported as the FIRST line of app/_layout.tsx, as a side-effect import (F4).
// Order inside this file matters too: imports evaluate top to bottom.
import "./platform/shims"; // localStorage (MMKV) + crypto.randomUUID: before any core module
import "react-native-url-polyfill/auto"; // @insforge/sdk uses URL + searchParams.append

import { configureAnalytics } from "@mindfulverse/core/analytics";
import { configureData } from "@mindfulverse/core/data";
import { configureSyncTriggers } from "@mindfulverse/core/sync/engine";
import { configureInsforge } from "@mindfulverse/core/sync/insforge";
import { INSFORGE_ANON_KEY, INSFORGE_URL } from "./env";
import { readBundledJson } from "./platform/data";
import { nativeSyncTriggers } from "./platform/syncTriggers";

configureInsforge({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
  // Mobile auth flow: refresh token comes back in the response body
  // (client_type=mobile) instead of an httpOnly cookie. session.ts persists it.
  isServerMode: true,
  // OAuth callback detection reads window.location, which RN lacks.
  auth: { detectOAuthCallback: false },
});
configureData(readBundledJson);
configureAnalytics({
  onTrack: __DEV__ ? (e) => console.debug("[track]", e) : undefined,
});
configureSyncTriggers(nativeSyncTriggers);
