// Web sync triggers: connectivity from navigator.onLine and the window
// "online" event; foreground from the document becoming visible again.
import type { SyncTriggers } from "../lib/sync/engine";

export const webSyncTriggers: SyncTriggers = {
  isOnline: () => navigator.onLine,
  onOnline(cb) {
    window.addEventListener("online", cb);
    return () => window.removeEventListener("online", cb);
  },
  onForeground(cb) {
    const onVisibility = () => {
      if (document.visibilityState === "visible") cb();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  },
};
