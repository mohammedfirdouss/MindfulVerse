import { describe, expect, it } from "vitest";

import {
  jwtClaims,
  MAX_FLOOR_MS,
  MIN_DELAY_MS,
  nextRefreshDelay,
  tokenDeadline,
} from "./sessionClock";

function jwt(claims: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o))
      .replace(/[=]+$/, "")
      .replaceAll("+", "-")
      .replaceAll("/", "_");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}

describe(jwtClaims, () => {
  it("reads iat and exp", () => {
    expect(jwtClaims(jwt({ exp: 1000, iat: 100, sub: "u" }))).toStrictEqual({
      exp: 1000,
      iat: 100,
    });
  });

  it("returns nulls for junk", () => {
    expect(jwtClaims("nope")).toStrictEqual({ exp: null, iat: null });
    expect(jwtClaims("a.!!!.c")).toStrictEqual({ exp: null, iat: null });
  });
});

describe(tokenDeadline, () => {
  it("lays the server-issued lifetime onto the device clock", () => {
    // A 15-minute token issued in 2020 (server time) received "now" on a
    // phone whose clock reads 2026: refresh 13 minutes from now, not at once.
    const now = Date.UTC(2026, 9, 6);
    const d = tokenDeadline({ exp: 1_600_000_900, iat: 1_600_000_000 }, now);
    expect(d!.refreshAtMs - now).toBe(780_000);
  });

  it("refreshes short-lived tokens halfway through", () => {
    expect(tokenDeadline({ exp: 60, iat: 0 }, 0)!.refreshAtMs).toBe(30_000);
  });

  it("falls back to exp when iat is missing, and to nothing without exp", () => {
    expect(tokenDeadline({ exp: 1000, iat: null }, 0)!.refreshAtMs).toBe(
      880_000
    );
    expect(tokenDeadline({ exp: null, iat: 10 }, 0)).toBeNull();
  });
});

describe(nextRefreshDelay, () => {
  it("waits until the deadline and resets the streak", () => {
    expect(nextRefreshDelay({ refreshAtMs: 60_000 }, 0, 3)).toStrictEqual({
      delayMs: 60_000,
      quickStreak: 0,
    });
  });

  it("backs off when every token looks stale (skewed clock without iat)", () => {
    let streak = 0;
    const delays: number[] = [];
    for (let i = 0; i < 12; i++) {
      const next = nextRefreshDelay({ refreshAtMs: -1 }, 0, streak);
      delays.push(next.delayMs);
      streak = next.quickStreak;
    }
    expect(delays.slice(0, 4)).toStrictEqual([MIN_DELAY_MS, 10_000, 20_000, 40_000]);
    expect(delays.at(-1)).toBe(MAX_FLOOR_MS);
  });
});
