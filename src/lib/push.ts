// Web Push subscription management. A subscription row belongs to this
// device+account pair; a user can hold one row per device.
import { insforge } from "./insforge";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupport(): "ok" | "needs-install" | "unsupported" {
  if ("Notification" in window && "PushManager" in window && "serviceWorker" in navigator) return "ok";
  // iOS Safari exposes push only to installed (home-screen) PWAs.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return isIOS ? "needs-install" : "unsupported";
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function getReminder(): Promise<{ time: string } | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const { data } = await insforge.database
    .from("push_subscriptions")
    .select("reminder_time")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  return data ? { time: data.reminder_time } : null;
}

export interface EnableResult {
  error: string | null;
  /** True when today's verse was pushed to this device immediately. */
  welcomed: boolean;
}

export async function enableReminder(time: string): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "Notifications were not allowed.", welcomed: false };
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY
      ) as BufferSource,
    }));
  const json = sub.toJSON();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // endpoint is the PK: delete-then-insert acts as an upsert under RLS.
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await insforge.database.from("push_subscriptions").insert([
    { endpoint: sub.endpoint, keys: json.keys, reminder_time: time, timezone },
  ]);
  // If this insert fails, the browser subscription above still exists and is
  // reused (not re-created) by the next enableReminder() call — self-healing
  // on retoggle, but this attempt still surfaces the error to the caller.
  if (error) return { error: error.message, welcomed: false };

  // Deliver today's verse to this device right away — the same push the
  // daily schedule sends, through the same pipeline, so enabling doubles as
  // a live end-to-end test. Best-effort: the subscription stands either way.
  let welcomed = false;
  try {
    const { error: fnError } = await insforge.functions.invoke("send-reminders", {
      body: { endpoint: sub.endpoint },
    });
    welcomed = !fnError;
  } catch {
    /* welcome push is a bonus — never fail the toggle over it */
  }
  return { error: null, welcomed };
}

/** Persist a new reminder time for this device's existing subscription.
 *  No-op when the device has no subscription (reminder toggled off). */
export async function updateReminderTime(time: string): Promise<{ error: string | null }> {
  const sub = await currentSubscription();
  if (!sub) return { error: null };
  const { error } = await insforge.database
    .from("push_subscriptions")
    .update({ reminder_time: time })
    .eq("endpoint", sub.endpoint);
  return { error: error ? error.message : null };
}

export async function disableReminder(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
