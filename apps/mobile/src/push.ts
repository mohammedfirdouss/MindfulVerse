// Daily-reminder registration for native, mirroring apps/web/src/lib/push.ts
// (same function names and results) over the Phase 3 contract
// (docs/superpowers/plans/2026-10-06-rn-phase3-push-platform.md):
// one push_subscriptions row per device+account, endpoint = Expo push token,
// platform = 'expo', keys omitted, user_id defaulted by the server.
//
// Requires (none exist yet, see README "Push"):
//   - an EAS project id in app config `extra.eas.projectId` (`eas init`);
//   - FCM credentials: google-services.json + FCM V1 key uploaded to EAS;
//   - the Phase 3 migration + send-reminders deploy ("Apply later").
// Until then pushSupport() is "no-project" and enableReminder() fails with a
// clear message instead of throwing.
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { insforge } from "@mindfulverse/core/sync/insforge";

const TOKEN_KEY = "mindfulverse.expoPushToken.v1";
// send-reminders sets no channelId, and Expo delivers those to the "default"
// channel, so configure that one rather than a named channel.
export const REMINDER_CHANNEL = "default";

export type PushSupport = "ok" | "no-project";

function projectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId ?? null;
}

export function pushSupport(): PushSupport {
  return projectId() ? "ok" : "no-project";
}

const NO_PROJECT_MESSAGE =
  "Reminders aren't set up in this build yet (no EAS project id). See apps/mobile/README.md.";

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
  if (!id) return { token: null, error: NO_PROJECT_MESSAGE };
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
    // Typically missing FCM config (google-services.json) in this build.
    return { token: null, error: `Couldn't get a push token: ${e instanceof Error ? e.message : String(e)}` };
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

export async function disableReminder(): Promise<void> {
  const token = storedToken();
  if (!token) return;
  await insforge.database.from("push_subscriptions").delete().eq("endpoint", token);
}

/** Call BEFORE session.signOut(): once signed out, RLS blocks deleting the
 *  account's rows, and this device would keep receiving its reminders. */
export async function unregisterPush(userId: string): Promise<void> {
  await insforge.database.from("push_subscriptions").delete().eq("user_id", userId);
}
