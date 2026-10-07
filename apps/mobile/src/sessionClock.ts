// When to refresh an access token, measured on the device clock only.
//
// The JWT's `exp` is server time. Comparing it with Date.now() breaks on a
// phone whose clock is off: a clock running ahead sees every new token as
// already expired, and a "refresh 2 min before exp, at least 5 s from now"
// rule then refreshes every 5 s forever. Instead the token's lifetime
// (exp - iat, both server-issued) is laid onto the device clock from the
// moment the token arrived. A backoff floor is the backstop for tokens without
// `iat` (or with a lifetime shorter than the leeway). Pure: no RN, no SDK.

export const REFRESH_LEEWAY_MS = 120_000;
export const MIN_DELAY_MS = 5_000;
export const MAX_FLOOR_MS = 10 * 60_000;

export interface TokenClaims {
  iat: number | null;
  exp: number | null;
}

/** `iat`/`exp` (seconds) from a JWT, nulls when it can't be decoded. */
export function jwtClaims(token: string): TokenClaims {
  try {
    const part = token.split(".")[1];
    if (!part) return { iat: null, exp: null };
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")));
    return {
      iat: typeof json.iat === "number" ? json.iat : null,
      exp: typeof json.exp === "number" ? json.exp : null,
    };
  } catch {
    return { iat: null, exp: null };
  }
}

export interface TokenDeadline {
  /** Device-clock ms after which the token should be treated as near expiry. */
  refreshAtMs: number;
}

/** The device-clock moment to refresh a token received at `receivedAtMs`,
 *  or null when the token carries no expiry. */
export function tokenDeadline(claims: TokenClaims, receivedAtMs: number): TokenDeadline | null {
  const { iat, exp } = claims;
  if (exp === null) return null;
  if (iat !== null && exp > iat) {
    const lifetimeMs = (exp - iat) * 1000;
    // Short-lived tokens refresh halfway through rather than "120 s early".
    const leeway = Math.min(REFRESH_LEEWAY_MS, lifetimeMs / 2);
    return { refreshAtMs: receivedAtMs + lifetimeMs - leeway };
  }
  // No usable iat: fall back to exp on the device clock (skew-prone; the
  // backoff in nextRefreshDelay keeps that from looping fast).
  return { refreshAtMs: exp * 1000 - REFRESH_LEEWAY_MS };
}

/** Delay before the scheduled refresh. `quickStreak` counts consecutive
 *  refreshes whose delay was clamped to the floor; the floor doubles with
 *  each (5 s, 10 s, 20 s … 10 min) so a bad clock or a server minting
 *  instantly-stale tokens can't refresh every 5 s forever. */
export function nextRefreshDelay(
  deadline: TokenDeadline,
  nowMs: number,
  quickStreak: number,
): { delayMs: number; quickStreak: number } {
  const floor = Math.min(MAX_FLOOR_MS, MIN_DELAY_MS * 2 ** quickStreak);
  const raw = deadline.refreshAtMs - nowMs;
  if (raw < floor) return { delayMs: floor, quickStreak: quickStreak + 1 };
  return { delayMs: raw, quickStreak: 0 };
}
