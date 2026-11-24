import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  CIRCLE_CODE_ALPHABET,
  circleCountLine,
  circleError,
  createCircle,
  deleteCircle,
  fetchCircle,
  fetchCircleWeekCount,
  getJoinedCircle,
  isCircleCode,
  joinCircle,
  leaveCircle,
  listMyCircles,
  newCircleCode,
  normalizeName,
  onJoinedCircleChange,
  parseCircleLink,
  recordCircleReflection,
  refreshJoinedCircle,
  setCircleMemberCall,
  updateCircle,
  wireCircleReflections,
} from "./circles";
import type {
  Circle,
  CircleApi,
  CircleMemberCall,
  CircleReflectionRow,
  CircleResult,
  CircleRow,
} from "./circles";
import { getCircleSurah, setCircleSurah } from "./circleSurah";
import { addEntry } from "./journal";

const CODE_SHAPE = /^[a-hjkmnp-z2-9]{6}$/u;
const UUID_SHAPE = /^[0-9a-f-]{36}$/u;

const circle: Circle = {
  code: "abc234",
  name: "Friday friends",
  surah: 18,
  updatedAt: Date.parse("2026-11-08T10:00:00.000Z"),
  verse: 10,
  verseEnd: null,
};

const row: CircleRow = {
  code: "abc234",
  name: "Friday friends",
  surah: 18,
  updated_at: "2026-11-08T10:00:00.000Z",
  verse: 10,
};

function fakeApi(overrides: Partial<CircleApi> = {}): CircleApi {
  const empty = async () => ({ data: [], error: null });
  return {
    get: empty,
    insert: empty,
    listMine: empty,
    remove: empty,
    update: empty,
    ...overrides,
  };
}

const memberCall = vi.fn<CircleMemberCall>(async () => null);
setCircleMemberCall(memberCall);

beforeEach(() => {
  store.clear();
  memberCall.mockClear();
});

describe(normalizeName, () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Friday \n  friends ")).toBe("Friday friends");
  });

  it("rejects empty names", () => {
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName(42)).toBeNull();
  });

  it("caps at 40 characters", () => {
    expect(normalizeName("a".repeat(60))).toHaveLength(40);
  });
});

describe(newCircleCode, () => {
  it("uses only the unambiguous alphabet", () => {
    expect(CIRCLE_CODE_ALPHABET).not.toMatch(/[01ilo]/u);
    expect(new Set(CIRCLE_CODE_ALPHABET).size).toBe(
      CIRCLE_CODE_ALPHABET.length
    );
    for (let i = 0; i < 200; i += 1) {
      const code = newCircleCode();
      expect(code).toMatch(CODE_SHAPE);
      expect(isCircleCode(code)).toBeTruthy();
    }
  });

  it("skips biased bytes", () => {
    const random = vi
      .fn<(n: number) => Uint8Array>()
      .mockReturnValueOnce(new Uint8Array([255, 0, 1, 2, 3, 4]))
      .mockReturnValueOnce(new Uint8Array([5, 6, 7, 8, 9, 10]));
    expect(newCircleCode(random)).toBe("abcdef");
  });
});

describe(isCircleCode, () => {
  it("rejects ambiguous characters and wrong lengths", () => {
    expect(isCircleCode("abc234")).toBeTruthy();
    expect(isCircleCode("abc10o")).toBeFalsy();
    expect(isCircleCode("ABC234")).toBeFalsy();
    expect(isCircleCode("abc23")).toBeFalsy();
  });
});

describe(parseCircleLink, () => {
  it("reads codes from bare text, paths and full links", () => {
    const expected = { code: "abc234", kind: "code" };
    expect(parseCircleLink("abc234")).toStrictEqual(expected);
    expect(parseCircleLink(" ABC234 ")).toStrictEqual(expected);
    expect(parseCircleLink("/circle/abc234")).toStrictEqual(expected);
    expect(
      parseCircleLink("https://mindfulverse.app/circle/abc234?ref=x#top")
    ).toStrictEqual(expected);
    expect(parseCircleLink("mindfulverse://circle/abc234")).toStrictEqual(
      expected
    );
  });

  it("still opens invites shared on the old address", () => {
    const expected = { code: "abc234", kind: "code" };
    expect(
      parseCircleLink("https://mindfulverse.vercel.app/circle/abc234")
    ).toStrictEqual(expected);
    expect(
      parseCircleLink("https://www.mindfulverse.app/circle/ABC234/")
    ).toStrictEqual(expected);
    expect(
      parseCircleLink("https://mindfulverse.vercel.app/circle/18")
    ).toStrictEqual({ kind: "surah", surah: 18 });
  });

  it("keeps old numeric links as surah links", () => {
    expect(parseCircleLink("/circle/18")).toStrictEqual({
      kind: "surah",
      surah: 18,
    });
    expect(parseCircleLink(114)).toStrictEqual({ kind: "surah", surah: 114 });
  });

  it("rejects anything else", () => {
    expect(parseCircleLink("/circle/115")).toBeNull();
    expect(parseCircleLink("/circle/abc10o")).toBeNull();
    expect(parseCircleLink("/circle/%E0%A4%A")).toBeNull();
    expect(parseCircleLink("1e2")).toBeNull();
    expect(parseCircleLink(null)).toBeNull();
  });
});

describe(createCircle, () => {
  it("validates before calling the server", async () => {
    const insert = vi.fn(fakeApi().insert);
    const api = fakeApi({ insert });
    await expect(
      createCircle({ name: " ", surah: 18 }, api)
    ).resolves.toStrictEqual({
      error: circleError("invalid"),
      ok: false,
    });
    await expect(
      createCircle({ name: "A", surah: 18, verse: 300 }, api)
    ).resolves.toMatchObject({ ok: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it("retries with a fresh code on a conflict", async () => {
    const insert = vi
      .fn<CircleApi["insert"]>()
      .mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockImplementationOnce(async (r) => ({
        data: [{ ...row, code: r.code }],
        error: null,
      }));
    const result = await createCircle(
      { name: "  Friday  friends ", surah: 18, verse: 10 },
      fakeApi({ insert })
    );
    expect(insert).toHaveBeenCalledTimes(2);
    const [first, second] = insert.mock.calls.map((c) => c[0]);
    expect(first?.code).not.toBe(second?.code);
    expect(second).toMatchObject({
      name: "Friday friends",
      surah: 18,
      verse: 10,
    });
    expect(result).toStrictEqual({
      ok: true,
      value: { ...circle, code: second?.code },
    });
  });

  it("joins the created circle on this device", async () => {
    const insert = vi.fn<CircleApi["insert"]>(async (r) => ({
      data: [{ ...row, code: r.code }],
      error: null,
    }));
    const result = await createCircle(
      { name: "Friday friends", surah: 18, verse: 10 },
      fakeApi({ insert })
    );
    expect(result.ok).toBeTruthy();
    expect(getJoinedCircle()).toStrictEqual(result.ok ? result.value : null);
  });

  it("joins nothing when the insert fails", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: { code: "42501" },
    }));
    await createCircle({ name: "A", surah: 1 }, fakeApi({ insert }));
    expect(getJoinedCircle()).toBeNull();
  });

  it("gives up after three conflicts", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: { code: "23505" },
    }));
    const result = await createCircle(
      { name: "A", surah: 1 },
      fakeApi({ insert })
    );
    expect(insert).toHaveBeenCalledTimes(3);
    expect(result).toStrictEqual({ error: circleError("unknown"), ok: false });
  });

  it("maps a permission error to signed-out", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: { code: "42501" },
    }));
    await expect(
      createCircle({ name: "A", surah: 1 }, fakeApi({ insert }))
    ).resolves.toStrictEqual({ error: circleError("signed-out"), ok: false });
  });

  it("never rejects when the client throws", async () => {
    const insert = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch"))
    );
    await expect(
      createCircle({ name: "A", surah: 1 }, fakeApi({ insert }))
    ).resolves.toStrictEqual({ error: circleError("network"), ok: false });
  });
});

describe(updateCircle, () => {
  it("sends only the changed fields and refreshes the joined copy", async () => {
    joinCircle(circle);
    const update = vi.fn<CircleApi["update"]>(async () => ({
      data: [
        {
          ...row,
          surah: 36,
          updated_at: "2026-11-09T00:00:00.000Z",
          verse: null,
        },
      ],
      error: null,
    }));
    const result = await updateCircle(
      "abc234",
      { surah: 36, verse: null },
      fakeApi({ update })
    );
    expect(update).toHaveBeenCalledWith("abc234", {
      surah: 36,
      verse: null,
      verse_end: null,
    });
    expect(result.ok).toBeTruthy();
    expect(getJoinedCircle()).toMatchObject({ surah: 36, verse: null });
  });

  it("reports not-found when no row came back", async () => {
    await expect(
      updateCircle("abc234", { name: "New" }, fakeApi())
    ).resolves.toStrictEqual({ error: circleError("not-found"), ok: false });
  });

  it("rejects bad patches", async () => {
    await expect(
      updateCircle("abc234", { surah: 0 }, fakeApi())
    ).resolves.toMatchObject({
      error: { kind: "invalid" },
    });
  });
});

describe(deleteCircle, () => {
  it("leaves the circle on this device when it was joined", async () => {
    joinCircle(circle);
    const remove = vi.fn(async () => ({
      data: [{ code: "abc234" }],
      error: null,
    }));
    await expect(
      deleteCircle("abc234", fakeApi({ remove }))
    ).resolves.toStrictEqual({
      ok: true,
      value: null,
    });
    expect(getJoinedCircle()).toBeNull();
  });
});

describe(listMyCircles, () => {
  it("drops malformed rows", async () => {
    const listMine = vi.fn(async () => ({
      data: [row, { ...row, code: "bad" }],
      error: null,
    }));
    await expect(listMyCircles(fakeApi({ listMine }))).resolves.toStrictEqual({
      ok: true,
      value: [circle],
    });
  });
});

describe(fetchCircle, () => {
  it("returns the one circle the rpc found", async () => {
    const get = vi.fn(async () => ({ data: [row], error: null }));
    await expect(
      fetchCircle("abc234", fakeApi({ get }))
    ).resolves.toStrictEqual({
      ok: true,
      value: circle,
    });
    expect(get).toHaveBeenCalledWith("abc234");
  });

  it("reports not-found for an empty result or a malformed code", async () => {
    await expect(fetchCircle("abc234", fakeApi())).resolves.toMatchObject({
      error: { kind: "not-found" },
    });
    await expect(fetchCircle("nope", fakeApi())).resolves.toMatchObject({
      error: { kind: "not-found" },
    });
  });
});

describe("membership", () => {
  it("caches the joined circle and replaces it on a new join", () => {
    expect(getJoinedCircle()).toBeNull();
    expect(joinCircle(circle)).toBeTruthy();
    expect(getJoinedCircle()).toStrictEqual(circle);
    const other = { ...circle, code: "xyz789", name: "Study group" };
    joinCircle(other);
    expect(getJoinedCircle()).toStrictEqual(other);
  });

  it("clears an old numeric circle surah on join", () => {
    setCircleSurah(36);
    joinCircle(circle);
    expect(getCircleSurah()).toBeNull();
  });

  it("refuses a malformed circle", () => {
    expect(joinCircle({ ...circle, code: "bad" })).toBeFalsy();
    expect(getJoinedCircle()).toBeNull();
  });

  it("ignores corrupt storage", () => {
    store.set("mindfulverse.circle.v1", "{not json");
    expect(getJoinedCircle()).toBeNull();
  });

  it("leaves and notifies listeners", () => {
    const seen: (Circle | null)[] = [];
    const stop = onJoinedCircleChange((c) => seen.push(c));
    joinCircle(circle);
    leaveCircle();
    stop();
    joinCircle(circle);
    expect(seen).toStrictEqual([circle, null]);
    expect(getJoinedCircle()).toStrictEqual(circle);
  });
});

describe(refreshJoinedCircle, () => {
  const ok = (value: Circle): CircleResult<Circle> => ({ ok: true, value });

  it("resolves null without fetching when nothing is joined", async () => {
    const fetcher = vi.fn(async () => ok(circle));
    await expect(refreshJoinedCircle(fetcher)).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("updates the cache with the owner's change", async () => {
    joinCircle(circle);
    const changed = { ...circle, updatedAt: circle.updatedAt + 1, verse: 11 };
    const fetcher = vi.fn(async () => ok(changed));
    await expect(refreshJoinedCircle(fetcher)).resolves.toStrictEqual(changed);
    expect(fetcher).toHaveBeenCalledWith("abc234");
    expect(getJoinedCircle()).toStrictEqual(changed);
  });

  it("leaves a circle that no longer exists", async () => {
    joinCircle(circle);
    const fetcher = vi.fn(async (): Promise<CircleResult<Circle>> => ({
      error: circleError("not-found"),
      ok: false,
    }));
    await expect(refreshJoinedCircle(fetcher)).resolves.toBeNull();
    expect(getJoinedCircle()).toBeNull();
  });

  it("keeps the cached circle when offline", async () => {
    joinCircle(circle);
    const fetcher = vi.fn(async (): Promise<CircleResult<Circle>> => ({
      error: circleError("network"),
      ok: false,
    }));
    await expect(refreshJoinedCircle(fetcher)).resolves.toStrictEqual(circle);
    expect(getJoinedCircle()).toStrictEqual(circle);
  });
});

describe(recordCircleReflection, () => {
  const today = new Date(2026, 10, 8, 21, 30);

  it("is a no-op outside a circle", async () => {
    const send = vi.fn(async () => null);
    await expect(recordCircleReflection(today, send)).resolves.toBeFalsy();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends only the install id, circle code and local date", async () => {
    joinCircle(circle);
    const send = vi.fn(async (_row: CircleReflectionRow) => null);
    await expect(recordCircleReflection(today, send)).resolves.toBeTruthy();
    expect(send.mock.calls[0]?.[0]).toStrictEqual({
      circle_code: "abc234",
      day: "2026-11-08",
      install_id: expect.stringMatching(UUID_SHAPE),
    });
  });

  it("sends once per circle and local day", async () => {
    joinCircle(circle);
    const send = vi.fn(async () => null);
    await recordCircleReflection(today, send);
    await recordCircleReflection(today, send);
    await recordCircleReflection(new Date(2026, 10, 9, 0, 5), send);
    joinCircle({ ...circle, code: "xyz789" });
    await recordCircleReflection(new Date(2026, 10, 9, 0, 6), send);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("treats a duplicate as sent and retries after other errors", async () => {
    joinCircle(circle);
    const duplicate = vi.fn(async () => ({ code: "23505" }));
    await recordCircleReflection(today, duplicate);
    const after = vi.fn(async () => null);
    await expect(recordCircleReflection(today, after)).resolves.toBeFalsy();

    store.clear();
    joinCircle(circle);
    const offline = vi.fn(async () => ({ statusCode: 500 }));
    await recordCircleReflection(today, offline);
    await expect(recordCircleReflection(today, after)).resolves.toBeTruthy();
  });

  it("never rejects when the send throws", async () => {
    joinCircle(circle);
    const send = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(recordCircleReflection(today, send)).resolves.toBeFalsy();
  });
});

describe(wireCircleReflections, () => {
  it("records a reflection whenever a journal entry is kept", async () => {
    joinCircle(circle);
    const send = vi.fn(async () => null);
    const unwire = wireCircleReflections(send);
    try {
      expect(wireCircleReflections(send)).toBe(unwire);
      addEntry({ body: "b", prompt: "p" });
      await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    } finally {
      unwire();
    }
    store.clear();
    joinCircle(circle);
    addEntry({ body: "b", prompt: "p" });
    await Promise.resolve();
    expect(send).toHaveBeenCalledOnce();
  });
});

describe(fetchCircleWeekCount, () => {
  it("reads the count from the rpc", async () => {
    const fetcher = vi.fn(async () => ({ data: 3, error: null }));
    await expect(fetchCircleWeekCount("abc234", fetcher)).resolves.toBe(3);
    expect(fetcher).toHaveBeenCalledWith("abc234");
  });

  it("accepts a row-shaped or string count", async () => {
    await expect(
      fetchCircleWeekCount("abc234", async () => ({
        data: [{ circle_week_count: 4 }],
        error: null,
      }))
    ).resolves.toBe(4);
    await expect(
      fetchCircleWeekCount("abc234", async () => ({ data: "5", error: null }))
    ).resolves.toBe(5);
  });

  it("is null on any error or a bad code", async () => {
    const fetcher = vi.fn(async () => ({ data: 2, error: null }));
    await expect(fetchCircleWeekCount("nope", fetcher)).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      fetchCircleWeekCount("abc234", async () => ({
        data: null,
        error: { code: "500" },
      }))
    ).resolves.toBeNull();
    await expect(
      fetchCircleWeekCount("abc234", () => Promise.reject(new Error("x")))
    ).resolves.toBeNull();
    await expect(
      fetchCircleWeekCount("abc234", async () => ({ data: "x", error: null }))
    ).resolves.toBeNull();
  });
});

describe(circleCountLine, () => {
  it("stays silent below two", () => {
    expect(circleCountLine("Friday friends", 0)).toBeNull();
    expect(circleCountLine("Friday friends", 1)).toBeNull();
  });

  it("names the circle and the count", () => {
    expect(circleCountLine("Friday friends", 2)).toBe(
      "2 in Friday friends reflected this week."
    );
    expect(circleCountLine("Friday friends", 12)).toBe(
      "12 in Friday friends reflected this week."
    );
    expect(circleCountLine(null, 3)).toBe("3 people reflected this week.");
  });
});
