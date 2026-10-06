// Account session persistence for native.
//
// @insforge/sdk keeps tokens in memory only. On web an httpOnly refresh cookie
// rehydrates the session on reload; native has no cookie, so the client runs
// in server mode (setup.ts) and this module does the rest:
//   - persists the refresh token in expo-secure-store after every sign-in,
//     email verification and refresh;
//   - restores the session on launch (restore()), BEFORE <AccountProvider>
//     mounts, so its first getCurrentUser() already sees the user;
//   - refreshes the access token before it expires and when the app returns
//     to the foreground, because server mode turns off the SDK's own
//     401-refresh-and-retry.
//
// Two SDK details this relies on (read from @insforge/sdk 1.5.2 dist):
//   - in server mode, signIn/refresh set the HTTP bearer token but NOT the
//     TokenManager, and getCurrentUser() reads the TokenManager. So every
//     success calls insforge.setAccessToken(token) to fill it.
//   - refreshSession({ refreshToken }) posts to /api/auth/refresh?client_type=mobile
//     and may rotate the refresh token; the new one is persisted.
//
// Email/password only. OAuth is out of scope: PKCE needs crypto.subtle (absent
// on Hermes) and a redirect flow via expo-web-browser (Phase 0 findings).
//
// Screens call these, then `await refresh()` from useAccount() and
// `await syncNow()` — the same sequence web's Account page uses.
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { AuthChangeEvent } from "@insforge/sdk";
import { insforge } from "@mindfulverse/core/sync/insforge";

const REFRESH_KEY = "mindfulverse.refreshToken.v1";
const RESTORE_TIMEOUT_MS = 4000;
const REFRESH_LEEWAY_S = 120;

export interface AuthResult {
  /** User-facing message, or null on success. */
  error: string | null;
}

interface TokenResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Called when the signed-in state changes outside a screen's own call:
 *  a slow restore() finishing after the UI mounted, or a refresh that found
 *  the session revoked. The root layout uses it to re-run AccountProvider's
 *  refresh(). Returns an unsubscribe function. */
export function onSessionChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const emit = () => listeners.forEach((cb) => cb());

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<boolean> | null = null;
// Bumped by clearLocal() (sign-out, revoked token). An auth call that started
// before it must not adopt its result afterwards: a refresh in flight when
// the user taps Sign out would otherwise sign them straight back in.
let generation = 0;

/** JWT `exp` in seconds, or null if the token can't be decoded. */
function jwtExp(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

// The access token this module last handed to the SDK (the SDK's own
// TokenManager is private).
let accessToken: string | null = null;

function currentAccessToken(): string | null {
  return accessToken;
}

function expiresSoon(): boolean {
  const token = currentAccessToken();
  if (!token) return false;
  const exp = jwtExp(token);
  return exp !== null && exp - Date.now() / 1000 < REFRESH_LEEWAY_S;
}

function scheduleRefresh(accessToken: string): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const exp = jwtExp(accessToken);
  if (exp === null) return;
  const ms = Math.max(5_000, (exp - REFRESH_LEEWAY_S) * 1000 - Date.now());
  refreshTimer = setTimeout(() => void refreshNow(), ms);
}

/** Applies a successful auth response: fills the SDK's token manager,
 *  persists the refresh token, schedules the next refresh. */
async function adopt(
  res: TokenResponse | null | undefined,
  event: typeof AuthChangeEvent.SIGNED_IN | typeof AuthChangeEvent.TOKEN_REFRESHED,
  gen: number,
): Promise<boolean> {
  if (!res?.accessToken || gen !== generation) return false;
  accessToken = res.accessToken;
  insforge.setAccessToken(res.accessToken, event);
  if (res.refreshToken) {
    try {
      await SecureStore.setItemAsync(REFRESH_KEY, res.refreshToken);
    } catch (e) {
      // Signed in for this run; just won't survive a restart.
      console.warn("[session] could not persist refresh token:", e);
    }
    // Signed out while the token was being written: clearLocal() has already
    // reset memory, but its delete may have run before this write landed.
    if (gen !== generation) {
      await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
      return false;
    }
  }
  scheduleRefresh(res.accessToken);
  return true;
}

async function clearLocal(): Promise<void> {
  generation++;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = undefined;
  accessToken = null;
  insforge.setAccessToken(null);
  insforge.getHttpClient().setRefreshToken(null);
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* nothing stored */
  }
}

/** Exchanges the stored refresh token for a fresh session. Returns true if
 *  signed in afterwards. A rejected token (401/403) is forgotten; a network
 *  failure keeps it so the next attempt (foreground) can succeed. */
function refreshNow(): Promise<boolean> {
  inflight ??= (async () => {
    const gen = generation;
    let stored: string | null = null;
    try {
      stored = await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      stored = null;
    }
    if (!stored) return false;
    const wasSignedIn = currentAccessToken() !== null;
    const { data, error } = await insforge.auth.refreshSession({ refreshToken: stored });
    if (!error && (await adopt(data, AuthChangeEvent.TOKEN_REFRESHED, gen))) {
      if (!wasSignedIn) emit();
      return true;
    }
    // Signed out meanwhile: whatever the server said is about the old session.
    if (gen !== generation) return false;
    if (error && (error.statusCode === 401 || error.statusCode === 403)) {
      await clearLocal();
      if (wasSignedIn) emit();
    }
    return false;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Restores the persisted session. Call once at launch, before mounting
 *  <AccountProvider>. Resolves within ~4s even offline; if the refresh
 *  completes later, onSessionChange listeners fire. Never throws. */
export async function restore(): Promise<void> {
  const attempt = refreshNow().catch(() => false);
  await Promise.race([attempt, new Promise((r) => setTimeout(r, RESTORE_TIMEOUT_MS))]);
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const gen = generation;
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return (await adopt(data, AuthChangeEvent.SIGNED_IN, gen))
    ? { error: null }
    : { error: "Sign-in did not return a session." };
}

/** On success either signs in, or (needsVerification) the backend has
 *  emailed a 6-digit code: collect it and call verifyEmail(). */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult & { needsVerification: boolean }> {
  const gen = generation;
  const { data, error } = await insforge.auth.signUp({ email, password });
  if (error) return { error: error.message, needsVerification: false };
  if (data?.requireEmailVerification) return { error: null, needsVerification: true };
  return (await adopt(data, AuthChangeEvent.SIGNED_IN, gen))
    ? { error: null, needsVerification: false }
    : { error: null, needsVerification: true };
}

export async function verifyEmail(email: string, otp: string): Promise<AuthResult> {
  const gen = generation;
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });
  if (error) return { error: error.message };
  return (await adopt(data, AuthChangeEvent.SIGNED_IN, gen))
    ? { error: null }
    : { error: "Verification did not return a session." };
}

/** Signs out on the server (best effort) and forgets the stored token. The
 *  local session is always cleared, even if the server call fails.
 *  Turn off this device's reminder first (push.ts disableReminder, then
 *  forgetPushToken): once signed out, RLS no longer lets this device delete
 *  its own push_subscriptions row. */
export async function signOut(): Promise<void> {
  try {
    await insforge.auth.signOut();
  } catch {
    /* offline or token already invalid — local sign-out still happens */
  } finally {
    await clearLocal();
  }
}

/** True while an access token is held in memory. */
export function hasSession(): boolean {
  return currentAccessToken() !== null;
}

// Server mode has no automatic refresh-on-401, and timers don't fire while
// the app is suspended: refresh on return to the foreground when close to expiry.
AppState.addEventListener("change", (state) => {
  if (state === "active" && (expiresSoon() || (!hasSession() && !inflight))) void refreshNow();
});
