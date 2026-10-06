// Notification presentation + tap routing.
//
// Reminder payloads carry `data.url` (Phase 3 contract): "/tadabbur/{surah}?v={ayah}"
// or "/checkin". Those are also Expo Router paths here (file routes mirror
// web's), so a tap just pushes the URL. Both entry points are covered:
//   - cold start: the response that launched the app (getLastNotificationResponse);
//   - warm: addNotificationResponseReceivedListener.
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";

// Foreground presentation. shouldShowAlert is deprecated in SDK 57 (F5).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Only in-app paths: never let a payload open an arbitrary scheme. */
export function routeForNotification(data: unknown): string | null {
  const url = (data as { url?: unknown } | null)?.url;
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

const handled = new Set<string>();

function open(response: Notifications.NotificationResponse | null): void {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const id = response.notification.request.identifier;
  if (handled.has(id)) return; // cold-start response can also reach the listener
  handled.add(id);
  // Forget it natively too: `handled` lives in JS memory, so after a JS reload
  // (dev reload, an update) getLastNotificationResponse() would return the same
  // tap again and re-route. Best effort (SDK 57: clearLastNotificationResponse;
  // the Async variant is deprecated).
  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    /* not available on this platform */
  }
  const url = routeForNotification(response.notification.request.content.data);
  if (url) router.push(url as Href);
}

/** Mount once, inside the root navigator (app/_layout.tsx). */
export function useNotificationRouting(): void {
  useEffect(() => {
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
