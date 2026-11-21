import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
});

import {
  currentPassage,
  nextPassage,
  portionLabel,
  surahPassages,
} from "./circlePortion";
import {
  circleFromRow,
  circleMembersLine,
  circlesFull,
  createCircle,
  fetchCircleHistory,
  fetchCircleMemberCount,
  finishedSurahs,
  getJoinedCircle,
  getJoinedCircles,
  joinCircle,
  leaveCircle,
  MAX_JOINED_CIRCLES,
  recordCircleReflection,
  refreshJoinedCircles,
  setCircleMemberCall,
  touchCircleMembership,
  updateCircle,
} from "./circles";
import type {
  Circle,
  CircleApi,
  CircleMemberCall,
  CircleResult,
} from "./circles";
import { qrPath } from "./qr";

const base: Circle = {
  code: "abc234",
  name: "Friday friends",
  surah: 18,
  updatedAt: Date.parse("2026-11-08T10:00:00.000Z"),
  verse: null,
  verseEnd: null,
};
const circle = (code: string, name = code): Circle => ({ ...base, code, name });

const memberCall = vi.fn<CircleMemberCall>(async () => null);
setCircleMemberCall(memberCall);

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

beforeEach(() => {
  store.clear();
  memberCall.mockClear();
});

describe("weekly portion", () => {
  it("reads a range and drops one that runs backwards", () => {
    const row = { ...base, updated_at: "2026-11-08T10:00:00.000Z" };
    expect(circleFromRow({ ...row, verse: 7, verse_end: 12 })).toMatchObject({
      verse: 7,
      verseEnd: 12,
    });
    expect(circleFromRow({ ...row, verse: 7, verse_end: 3 })).toMatchObject({
      verse: 7,
      verseEnd: null,
    });
    expect(circleFromRow({ ...row, verse: null, verse_end: 3 })).toMatchObject({
      verse: null,
      verseEnd: null,
    });
  });

  it("sends a range, and treats a one-verse range as a focus verse", async () => {
    const insert = vi.fn<CircleApi["insert"]>(async () => ({
      data: [],
      error: null,
    }));
    await createCircle(
      { name: "A", surah: 18, verse: 7, verseEnd: 12 },
      fakeApi({ insert })
    );
    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      verse: 7,
      verse_end: 12,
    });
    await createCircle(
      { name: "A", surah: 18, verse: 7, verseEnd: 7 },
      fakeApi({ insert })
    );
    expect(insert.mock.calls[1]?.[0]).toMatchObject({
      verse: 7,
      verse_end: null,
    });
  });

  it("rejects an end without a start, or before it", async () => {
    const api = fakeApi();
    for (const draft of [
      { name: "A", surah: 18, verse: null, verseEnd: 5 },
      { name: "A", surah: 18, verse: 9, verseEnd: 5 },
      { name: "A", surah: 18, verse: 9, verseEnd: 400 },
    ]) {
      const result = await createCircle(draft, api);
      expect(result.ok).toBeFalsy();
    }
  });

  it("moves the whole portion on update", async () => {
    const update = vi.fn<CircleApi["update"]>(async () => ({
      data: [],
      error: null,
    }));
    await updateCircle(
      "abc234",
      { verse: 13, verseEnd: 17 },
      fakeApi({ update })
    );
    expect(update).toHaveBeenCalledWith("abc234", {
      verse: 13,
      verse_end: 17,
    });
  });
});

describe("passages", () => {
  const themes = [
    { ayahFrom: 1, ayahTo: 6, id: 1, surah: 18, theme: "Opening" },
    { ayahFrom: 1, ayahTo: 6, id: 2, surah: 18, theme: "Opening" },
    { ayahFrom: 13, ayahTo: 17, id: 4, surah: 18, theme: "The young men" },
    { ayahFrom: 7, ayahTo: 12, id: 3, surah: 18, theme: "The cave" },
    { ayahFrom: 1, ayahTo: 3, id: 5, surah: 19, theme: "Other surah" },
  ];
  const passages = surahPassages(themes, 18);

  it("lists each range once, in order", () => {
    expect(passages.map((p) => [p.from, p.to])).toStrictEqual([
      [1, 6],
      [7, 12],
      [13, 17],
    ]);
  });

  it("finds this week's passage and the next", () => {
    const week = { surah: 18, verse: 7, verseEnd: 12 };
    expect(currentPassage(passages, week)?.theme).toBe("The cave");
    expect(nextPassage(passages, week)?.from).toBe(13);
    expect(
      nextPassage(passages, { ...week, verse: 13, verseEnd: 17 })
    ).toBeNull();
    expect(
      nextPassage(passages, { ...week, verse: null, verseEnd: null })
    ).toBeNull();
    expect(
      nextPassage(passages, { ...week, verse: 4, verseEnd: null })?.from
    ).toBe(7);
  });

  it("labels the portion", () => {
    expect(portionLabel({ surah: 18, verse: 7, verseEnd: 12 })).toBe(
      "verses 7 to 12"
    );
    expect(portionLabel({ surah: 18, verse: 7, verseEnd: null })).toBe(
      "verse 7"
    );
    expect(portionLabel({ surah: 18, verse: null, verseEnd: null })).toBeNull();
  });
});

describe("more than one circle", () => {
  it("moves an old single circle into the list", () => {
    store.set(
      "mindfulverse.circle.v1",
      JSON.stringify({ ...base, verseEnd: undefined })
    );
    expect(getJoinedCircles().map((c) => c.code)).toStrictEqual(["abc234"]);
    expect(store.has("mindfulverse.circle.v1")).toBeFalsy();
  });

  it("puts the latest join first, and joining again brings it back first", () => {
    joinCircle(circle("abc234"));
    joinCircle(circle("xyz789"));
    expect(getJoinedCircle()?.code).toBe("xyz789");
    joinCircle(circle("abc234"));
    expect(getJoinedCircles().map((c) => c.code)).toStrictEqual([
      "abc234",
      "xyz789",
    ]);
  });

  it(`holds at most ${MAX_JOINED_CIRCLES}`, () => {
    for (const code of ["aaa222", "bbb333", "ccc444"]) {
      expect(joinCircle(circle(code))).toBeTruthy();
    }
    expect(circlesFull("ddd555")).toBeTruthy();
    expect(circlesFull("aaa222")).toBeFalsy();
    expect(joinCircle(circle("ddd555"))).toBeFalsy();
    expect(getJoinedCircles()).toHaveLength(3);
  });

  it("leaves one circle and keeps the rest", () => {
    joinCircle(circle("abc234"));
    joinCircle(circle("xyz789"));
    leaveCircle("abc234");
    expect(getJoinedCircles().map((c) => c.code)).toStrictEqual(["xyz789"]);
    leaveCircle();
    expect(getJoinedCircle()).toBeNull();
  });

  it("counts a reflection toward every joined circle", async () => {
    joinCircle(circle("abc234"));
    joinCircle(circle("xyz789"));
    const send = vi.fn(async () => null);
    await recordCircleReflection(new Date(2026, 10, 21, 9), send);
    await recordCircleReflection(new Date(2026, 10, 21, 10), send);
    expect(send.mock.calls.map((c) => (c as unknown[])[0])).toMatchObject([
      { circle_code: "xyz789" },
      { circle_code: "abc234" },
    ]);
  });

  it("refreshes every circle and drops the ones that are gone", async () => {
    joinCircle(circle("abc234"));
    joinCircle(circle("xyz789"));
    const fetcher = vi.fn(
      async (code: string): Promise<CircleResult<Circle>> =>
        code === "abc234"
          ? { error: { kind: "not-found", message: "" }, ok: false }
          : { ok: true, value: { ...circle("xyz789"), surah: 36 } }
    );
    const after = await refreshJoinedCircles(fetcher);
    expect(after.map((c) => [c.code, c.surah])).toStrictEqual([["xyz789", 36]]);
  });
});

describe("member count", () => {
  it("says hello on join and goodbye on leave, with only the install id", async () => {
    joinCircle(circle("abc234"));
    await vi.waitFor(() => expect(memberCall).toHaveBeenCalledOnce());
    expect(memberCall.mock.calls[0]).toStrictEqual([
      "circle_touch",
      { p_code: "abc234", p_install_id: expect.any(String) },
    ]);
    leaveCircle("abc234");
    await vi.waitFor(() => expect(memberCall).toHaveBeenCalledTimes(2));
    expect(memberCall.mock.calls[1]?.[0]).toBe("circle_leave");
  });

  it("touches at most once a day per circle", async () => {
    const call = vi.fn<CircleMemberCall>(async () => null);
    joinCircle(circle("abc234"));
    const day = new Date(2026, 10, 21, 9);
    store.delete("mindfulverse.circleTouched.v1");
    await touchCircleMembership("abc234", day, call);
    await touchCircleMembership("abc234", day, call);
    await touchCircleMembership("abc234", new Date(2026, 10, 22, 9), call);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("reads the count, and is null on errors", async () => {
    await expect(
      fetchCircleMemberCount("abc234", async () => ({ data: 5, error: null }))
    ).resolves.toBe(5);
    await expect(
      fetchCircleMemberCount("abc234", async () => ({
        data: [{ circle_member_count: "4" }],
        error: null,
      }))
    ).resolves.toBe(4);
    await expect(
      fetchCircleMemberCount("abc234", async () => ({
        data: null,
        error: { code: "500" },
      }))
    ).resolves.toBeNull();
  });

  it("shows each number only at two or more", () => {
    expect(circleMembersLine("Friday friends", 5, 3)).toBe(
      "5 in Friday friends · 3 reflected this week."
    );
    expect(circleMembersLine("Friday friends", 5, 1)).toBe(
      "5 in Friday friends."
    );
    expect(circleMembersLine(null, 5, null)).toBe("5 people in this circle.");
    expect(circleMembersLine("Friday friends", 1, 3)).toBe(
      "3 in Friday friends reflected this week."
    );
    expect(circleMembersLine("Friday friends", 1, 1)).toBeNull();
    expect(circleMembersLine("Friday friends", null, null)).toBeNull();
  });
});

describe("surahs read together", () => {
  it("reads the history and lists finished surahs once", async () => {
    const history = await fetchCircleHistory("abc234", async () => ({
      data: [
        {
          ended_at: "2026-10-01T00:00:00Z",
          started_at: "2026-09-01T00:00:00Z",
          surah: 94,
        },
        {
          ended_at: "2026-11-01T00:00:00Z",
          started_at: "2026-10-01T00:00:00Z",
          surah: 18,
        },
        { ended_at: null, started_at: "2026-11-01T00:00:00Z", surah: 67 },
        { started_at: "bad", surah: 2 },
      ],
      error: null,
    }));
    expect(history).toHaveLength(3);
    expect(finishedSurahs(history)).toStrictEqual([94, 18]);
  });

  it("is empty on errors or a bad code", async () => {
    await expect(
      fetchCircleHistory("abc234", () => Promise.reject(new Error("x")))
    ).resolves.toStrictEqual([]);
    await expect(fetchCircleHistory("nope")).resolves.toStrictEqual([]);
  });
});

describe(qrPath, () => {
  it("draws a square code with the three finder patterns", () => {
    const { path, size } = qrPath(
      "https://mindfulverse.vercel.app/circle/abc234"
    );
    expect(size).toBeGreaterThanOrEqual(25);
    expect(path.startsWith("M0 0h7v1h-7z")).toBeTruthy();
    expect(path).toContain(`M${size - 7} 0h7v1h-7z`);
    expect(path).toContain(`M0 ${size - 1}h7v1h-7z`);
  });

  it("is the same for the same text", () => {
    expect(qrPath("abc")).toStrictEqual(qrPath("abc"));
  });
});
