import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  getInstallId,
  isCountedWebVisit,
  localDay,
  recordActiveDay,
} from "./activeDays";
import type { ActiveDayRow } from "./activeDays";
import { joinCircle, setCircleMemberCall } from "./circles";

setCircleMemberCall(async () => null);

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

beforeEach(() => {
  store.clear();
});

describe(localDay, () => {
  it("formats the local calendar day with zero padding", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 10, 7, 0, 1))).toBe("2026-11-07");
  });
});

describe(getInstallId, () => {
  it("creates a uuid once and reuses it", () => {
    const id = getInstallId();
    expect(id).toMatch(UUID);
    expect(getInstallId()).toBe(id);
  });

  it("replaces a malformed stored id", () => {
    store.set("mindfulverse.installId.v1", "not-a-uuid");
    expect(getInstallId()).toMatch(UUID);
  });

  it("falls back when crypto.randomUUID is missing", () => {
    vi.stubGlobal("crypto", {});
    try {
      expect(getInstallId()).toMatch(UUID);
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("localStorage", {
        getItem: (k: string) => store.get(k) ?? null,
        removeItem: (k: string) => void store.delete(k),
        setItem: (k: string, v: string) => void store.set(k, v),
      });
    }
  });
});

describe(recordActiveDay, () => {
  const morning = new Date(2026, 10, 7, 8, 0);
  const evening = new Date(2026, 10, 7, 21, 0);
  const nextDay = new Date(2026, 10, 8, 7, 0);

  it("sends one row with only install id, day, platform and circle", async () => {
    const send = vi.fn(async (_row: ActiveDayRow) => null);
    await recordActiveDay("android", morning, send);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toStrictEqual({
      circle_code: null,
      day: "2026-11-07",
      install_id: getInstallId(),
      platform: "android",
    });
  });

  it("includes the joined circle's code", async () => {
    joinCircle({
      code: "abc234",
      name: "Friday friends",
      surah: 18,
      updatedAt: 0,
      verse: 10,
      verseEnd: null,
    });
    const send = vi.fn(async (_row: ActiveDayRow) => null);
    await recordActiveDay("web", morning, send);
    expect(send.mock.calls[0]?.[0].circle_code).toBe("abc234");
  });

  it("sends once per local day", async () => {
    const send = vi.fn(async () => null);
    await expect(recordActiveDay("web", morning, send)).resolves.toBeTruthy();
    await expect(recordActiveDay("web", evening, send)).resolves.toBeFalsy();
    await expect(recordActiveDay("web", nextDay, send)).resolves.toBeTruthy();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a duplicate-key conflict as already sent", async () => {
    const send = vi.fn(async () => ({ code: "23505" }));
    await recordActiveDay("ios", morning, send);
    await recordActiveDay("ios", evening, send);
    expect(send).toHaveBeenCalledOnce();
  });

  it("retries on the next open after a failed send", async () => {
    const send = vi
      .fn<(row: ActiveDayRow) => Promise<unknown>>()
      .mockResolvedValueOnce({ message: "Network error" })
      .mockResolvedValueOnce(null);
    await recordActiveDay("web", morning, send);
    await recordActiveDay("web", evening, send);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("never rejects when the send throws", async () => {
    const send = vi.fn(() => Promise.reject(new Error("offline")));
    await expect(recordActiveDay("web", morning, send)).resolves.toBeFalsy();
  });

  it("skips a second call while one is in flight", async () => {
    let release: (v: null) => void = () => {};
    const send = vi.fn(
      () =>
        new Promise<null>((resolve) => {
          release = resolve;
        })
    );
    const first = recordActiveDay("web", morning, send);
    await expect(recordActiveDay("web", morning, send)).resolves.toBeFalsy();
    release(null);
    await first;
    expect(send).toHaveBeenCalledOnce();
  });
});

describe(isCountedWebVisit, () => {
  it("counts a person on the live site", () => {
    expect(isCountedWebVisit("mindfulverse.vercel.app", false)).toBeTruthy();
    expect(isCountedWebVisit("mindfulverse.app", false)).toBeTruthy();
    expect(isCountedWebVisit("WWW.MindfulVerse.app", false)).toBeTruthy();
  });

  it("skips dev servers, previews and automated browsers", () => {
    expect(isCountedWebVisit("localhost", false)).toBeFalsy();
    expect(isCountedWebVisit("127.0.0.1", false)).toBeFalsy();
    expect(
      isCountedWebVisit("mindfulverse-git-fix-x-amf.vercel.app", false)
    ).toBeFalsy();
    expect(isCountedWebVisit("mindfulverse.vercel.app", true)).toBeFalsy();
  });
});
