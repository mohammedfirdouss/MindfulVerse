// Installs the native implementations of the shared core's platform seams.
// Imported as the FIRST line of app/_layout.tsx, as a side-effect import (F4).
// Order inside this file matters too: imports evaluate top to bottom.
import "./platform/shims"; // localStorage (MMKV) + crypto.randomUUID: before any core module
import "react-native-url-polyfill/auto"; // @insforge/sdk uses URL + searchParams.append
import { pingActiveDay } from "@mindfulverse/core/activeDays";
import { configureAnalytics } from "@mindfulverse/core/analytics";
import { wireCircleReflections } from "@mindfulverse/core/circles";
import { configureData } from "@mindfulverse/core/data";
import { allowFeelingSharing } from "@mindfulverse/core/feelingCloud";
import { configureSyncTriggers } from "@mindfulverse/core/sync/engine";
import { configureInsforge } from "@mindfulverse/core/sync/insforge";
import { AppState, Platform } from "react-native";

import { INSFORGE_ANON_KEY, INSFORGE_URL } from "./env";
import { readBundledJson } from "./platform/data";
import { nativeSyncTriggers } from "./platform/syncTriggers";
import { ensureFreshSession } from "./session";

configureInsforge({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
  // Mobile auth flow: refresh token comes back in the response body
  // (client_type=mobile) instead of an httpOnly cookie. session.ts persists it.
  isServerMode: true,
  // OAuth callback detection reads window.location, which RN lacks.
  auth: { detectOAuthCallback: false },
});
wireCircleReflections();
configureData(readBundledJson);
// Development builds are us, not testers: only release builds count toward
// the launch test.
if (!__DEV__ && (Platform.OS === "ios" || Platform.OS === "android")) {
  // The same rule keeps development builds out of the feelings cloud.
  allowFeelingSharing(true);
  const platform = Platform.OS;
  pingActiveDay(platform);
  // A backgrounded app resumes on a new day without relaunching; count that too.
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      pingActiveDay(platform);
    }
  });
}
configureAnalytics({
  onTrack: __DEV__ ? (e) => console.debug("[track]", e) : undefined,
});
// The engine's foreground/reconnect syncs wait for the session to be fresh:
// on resume after the access token expired, both triggers fire at once, and a
// sync sent with the stale token gets a 401, reads as signed-out and stops
// passive syncs (server mode never refreshes on 401). ensureFreshSession()
// never throws, and the engine's callback always runs afterwards.
const afterFreshSession = (cb: () => void) => () => {
  void ensureFreshSession().then(() => {
    try {
      // oxlint-disable-next-line promise/no-callback-in-promise -- cb is the sync trigger, not a Node-style callback
      cb();
    } catch (error) {
      console.warn("[sync] trigger failed:", error);
    }
  });
};
configureSyncTriggers({
  isOnline: nativeSyncTriggers.isOnline,
  onForeground: (cb) => nativeSyncTriggers.onForeground(afterFreshSession(cb)),
  onOnline: (cb) => nativeSyncTriggers.onOnline(afterFreshSession(cb)),
});
