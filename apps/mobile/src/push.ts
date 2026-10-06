// Daily-reminder registration for native, mirroring apps/web/src/lib/push.ts
// (same function names and results) over the Phase 3 contract
// (docs/superpowers/plans/2026-10-06-rn-phase3-push-platform.md):
// one push_subscriptions row per device+account, endpoint = Expo push token,
// platform = 'expo', keys omitted, user_id defaulted by the server.
//
// Push is OFF in this release. Turning it on needs (README "Push"):
//   - an EAS project id in app config `extra.eas.projectId` (present);
//   - FCM: google-services.json referenced by `android.googleServicesFile`,
//     plus an FCM V1 service-account key uploaded with `eas credentials`;
//   - the Phase 3 migration + send-reminders deploy ("Apply later").
// pushSupport() is "not-configured" until android.googleServicesFile is set
// (without it getExpoPushTokenAsync fails on Android with "Default FirebaseApp
// is not initialized"), and "no-project" without a project id. iOS is not
// shipping yet: its APNs setup can't be detected from app config, so it is
// "not-configured" too. ReminderSection shows its "not in this version yet"
// copy for anything but "ok"; enableReminder() returns a friendly error.
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { insforge } from "@mindfulverse/core/sync/insforge";

const TOKEN_KEY = "mindfulverse.expoPushToken.v1";
// send-reminders sets no channelId, and Expo delivers those to the "default"
// channel, so configure that one rather than a named channel.
export const REMINDER_CHANNEL = "default";

export type PushSupport = "ok" | "no-project" | "not-configured";

function projectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId ?? null;
}

/** True when this build carries the native push credentials config. */
function fcmConfigured(): boolean {
  if (Platform.OS !== "android") return false; // iOS (APNs) isn't shipping yet
  return !!Constants.expoConfig?.android?.googleServicesFile;
}

export function pushSupport(): PushSupport {
  if (!projectId()) return "no-project";
  return fcmConfigured() ? "ok" : "not-configured";
}

const NOT_AVAILABLE_MESSAGE = "Reminders aren’t available in this version of the app yet.";
const TOKEN_FAILED_MESSAGE =
  "Couldn’t set up reminders on this phone right now. Please try again later.";

/** The token this device last registered, without prompting. */
function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // Android 8+: notifications need a channel; Android 13+ shows the
  // permission prompt only once a channel exists.
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: "Daily reminder",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

type TokenResult = { token: string; error: null } | { token: null; error: string };

/** Asks permission (if needed) and returns this device's Expo push token. */
async function obtainToken(): Promise<TokenResult> {
  const id = projectId();
  if (!id || pushSupport() !== "ok") return { token: null, error: NOT_AVAILABLE_MESSAGE };
  await ensureChannel();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return { token: null, error: "Notifications were not allowed." };
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    try {
      localStorage.setItem(TOKEN_KEY, data);
    } catch {
      /* re-fetched next time */
    }
    return { token: data, error: null };
  } catch (e) {
    // Typically missing/invalid FCM config in this build. The raw message
    // ("Default FirebaseApp is not initialized…") means nothing to a reader.
    console.warn("[push] getExpoPushTokenAsync failed:", e);
    return { token: null, error: TOKEN_FAILED_MESSAGE };
  }
}

export async function getReminder(): Promise<{ time: string } | null> {
  const token = storedToken();
  if (!token) return null;
  const { data } = await insforge.database
    .from("push_subscriptions")
    .select("reminder_time")
    .eq("endpoint", token)
    .maybeSingle();
  return data ? { time: data.reminder_time } : null;
}

export interface EnableResult {
  error: string | null;
  /** True when today's verse was pushed to this device immediately. */
  welcomed: boolean;
}

/** Registers this device for a daily reminder at `time` ("HH:MM", local).
 *  Must be signed in (RLS). */
export async function enableReminder(time: string): Promise<EnableResult> {
  const got = await obtainToken();
  if (got.error !== null) return { error: got.error, welcomed: false };
  const token = got.token;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // endpoint is the PK: delete-then-insert acts as an upsert under RLS.
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", token);
  const { error } = await insforge.database
    .from("push_subscriptions")
    .insert([{ endpoint: token, platform: "expo", reminder_time: time, timezone }]);
  if (error) return { error: error.message, welcomed: false };

  // Today's verse right away, through the same pipeline: doubles as a live
  // end-to-end test. Best effort.
  let welcomed = false;
  try {
    const { error: fnError } = await insforge.functions.invoke("send-reminders", {
      body: { endpoint: token },
    });
    welcomed = !fnError;
  } catch {
    /* bonus only */
  }
  return { error: null, welcomed };
}

/** No-op when this device has no registration. */
export async function updateReminderTime(time: string): Promise<{ error: string | null }> {
  const token = storedToken();
  if (!token) return { error: null };
  const { error } = await insforge.database
    .from("push_subscriptions")
    .update({ reminder_time: time })
    .eq("endpoint", token);
  return { error: error ? error.message : null };
}

export async function disableReminder(): Promise<{ error: string | null }> {
  const token = storedToken();
  if (!token) return { error: null };
  const { error } = await insforge.database.from("push_subscriptions").delete().eq("endpoint", token);
  return { error: error ? error.message : null };
}

/** Call BEFORE session.signOut(): once signed out, RLS blocks deleting the
 *  account's rows, and this device would keep receiving its reminders. */
export async function unregisterPush(userId: string): Promise<{ error: string | null }> {
  const { error } = await insforge.database.from("push_subscriptions").delete().eq("user_id", userId);
  return { error: error ? error.message : null };
}
