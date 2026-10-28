import type { SyncTriggers } from "@mindfulverse/core/sync/engine";
// Native sync triggers for core's engine: connectivity from NetInfo, and
// "foreground" as AppState returning to active.
import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

const reachable = (s: NetInfoState) =>
  s.isConnected !== false && s.isInternetReachable !== false;

// NetInfo is async; keep the last known state so isOnline() can be synchronous
// like navigator.onLine. Optimistic until the first event arrives.
let online = true;
NetInfo.addEventListener((s) => {
  online = reachable(s);
});

export const nativeSyncTriggers: SyncTriggers = {
  isOnline: () => online,
  onForeground(cb) {
    let prev: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && prev !== "active") {
        cb();
      }
      prev = next;
    });
    return () => sub.remove();
  },
  onOnline(cb) {
    let was = online;
    return NetInfo.addEventListener((s) => {
      const now = reachable(s);
      if (now && !was) {
        cb();
      }
      was = now;
    });
  },
};
