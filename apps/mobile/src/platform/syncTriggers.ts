// Native sync triggers for core's engine: connectivity from NetInfo, and
// "foreground" as AppState returning to active.
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import type { SyncTriggers } from "@mindfulverse/core/sync/engine";

const reachable = (s: NetInfoState) => s.isConnected !== false && s.isInternetReachable !== false;

// NetInfo is async; keep the last known state so isOnline() can be synchronous
// like navigator.onLine. Optimistic until the first event arrives.
let online = true;
NetInfo.addEventListener((s) => {
  online = reachable(s);
});

export const nativeSyncTriggers: SyncTriggers = {
  isOnline: () => online,
  onOnline(cb) {
    let was = online;
    return NetInfo.addEventListener((s) => {
      const now = reachable(s);
      if (now && !was) cb();
      was = now;
    });
  },
  onForeground(cb) {
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && prev !== "active") cb();
      prev = next;
    });
    return () => sub.remove();
  },
};
