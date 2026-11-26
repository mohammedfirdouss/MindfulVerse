import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  removeItem: (k: string) => void store.delete(k),
  setItem: (k: string, v: string) => void store.set(k, v),
};
vi.stubGlobal("localStorage", localStorageStub);

import {
  allowFeelingSharing,
  CLOUD_ID_KEY,
  CLOUD_OPT_IN_KEY,
  cloudFontSize,
  cloudWordLabel,
  fetchFeelingCloud,
  getCloudOptIn,
  getFeelingCloudId,
  setCloudOptIn,
  shareFeelings,
} from "./feelingCloud";
import type { SurahFeelingRow } from "./feelingCloud";
import { getInstallId } from "./installId";
import { configureInsforge, insforge } from "./sync/insforge";

beforeEach(() => {
  store.clear();
  allowFeelingSharing(true);
});

describe("cloud opt-in", () => {
  it("is off by default and remembers the tick", () => {
    expect(getCloudOptIn()).toBeFalsy();
    setCloudOptIn(true);
    expect(store.get(CLOUD_OPT_IN_KEY)).toBe("1");
    expect(getCloudOptIn()).toBeTruthy();
    setCloudOptIn(false);
    expect(getCloudOptIn()).toBeFalsy();
  });
});

describe(shareFeelings, () => {
  it("sends one row per approved word with only the cloud id, surah and word", async () => {
    setCloudOptIn(true);
    const send = vi.fn(async (_row: SurahFeelingRow) => null);
    await shareFeelings(
      112,
      ["Grateful", "Happy", "Peaceful", "Grateful", "<script>"],
      send
    );
    const rows = send.mock.calls.map((c) => c[0]);
    expect(rows).toStrictEqual([
      { feeling: "Peaceful", install_id: getFeelingCloudId(), surah: 112 },
      { feeling: "Grateful", install_id: getFeelingCloudId(), surah: 112 },
    ]);
  });

  it("uses its own random id, never the shared install id", async () => {
    const installId = getInstallId();
    setCloudOptIn(true);
    const send = vi.fn(async (_row: SurahFeelingRow) => null);
    await shareFeelings(112, ["Peaceful"], send);
    const sentId = send.mock.calls[0]?.[0].install_id;
    expect(sentId).toBe(store.get(CLOUD_ID_KEY));
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(sentId).not.toBe(installId);
    // The id is kept, so a reader's words count once.
    expect(getFeelingCloudId()).toBe(sentId);
  });

  it("sends with the anon key only, even when a reader is signed in", async () => {
    configureInsforge({
      anonKey: "anon-key",
      baseUrl: "https://backend.test/",
    });
    insforge.getHttpClient().setAuthToken("user-access-token");
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) => new Response(null)
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      setCloudOptIn(true);
      await shareFeelings(112, ["Peaceful"]);
    } finally {
      vi.unstubAllGlobals();
      vi.stubGlobal("localStorage", localStorageStub);
    }
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://backend.test/api/database/records/surah_feelings"
    );
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer anon-key");
    expect(JSON.stringify(init)).not.toContain("user-access-token");
    expect(JSON.parse(String(init?.body))).toStrictEqual([
      { feeling: "Peaceful", install_id: getFeelingCloudId(), surah: 112 },
    ]);
  });

  it("sends nothing when the box is not ticked", async () => {
    const send = vi.fn(async () => null);
    await shareFeelings(112, ["Peaceful"], send);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing from a build that may not share (dev, preview, tests)", async () => {
    setCloudOptIn(true);
    allowFeelingSharing(false);
    const send = vi.fn(async () => null);
    await shareFeelings(112, ["Peaceful"], send);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing with no approved words or a bad surah", async () => {
    setCloudOptIn(true);
    const send = vi.fn(async () => null);
    await shareFeelings(112, [], send);
    await shareFeelings(112, ["Happy"], send);
    await shareFeelings(115, ["Peaceful"], send);
    await shareFeelings(0, ["Peaceful"], send);
    expect(send).not.toHaveBeenCalled();
  });

  it("never rejects on a duplicate, an error or a thrown send", async () => {
    setCloudOptIn(true);
    const duplicate = vi.fn(async () => ({ code: "23505", statusCode: 409 }));
    await expect(
      shareFeelings(1, ["Peaceful", "Moved"], duplicate)
    ).resolves.toBeUndefined();
    expect(duplicate).toHaveBeenCalledTimes(2);
    const thrown = vi.fn(() => Promise.reject(new Error("offline")));
    await expect(
      shareFeelings(1, ["Peaceful"], thrown)
    ).resolves.toBeUndefined();
  });
});

describe(fetchFeelingCloud, () => {
  it("returns approved totals in FEELINGS order", async () => {
    const fetchCloud = vi.fn(async () => ({
      data: [
        { feeling: "Peaceful", readers: 10 },
        { feeling: "Grateful", readers: 4 },
        { feeling: "Moved", readers: 1 },
        { feeling: "Happy", readers: 9 },
        { feeling: "Hopeful", readers: 0 },
      ],
      error: null,
    }));
    await expect(fetchFeelingCloud(112, fetchCloud)).resolves.toStrictEqual([
      { feeling: "Peaceful", readers: 10 },
      { feeling: "Grateful", readers: 4 },
      { feeling: "Moved", readers: 1 },
    ]);
    expect(fetchCloud).toHaveBeenCalledWith(112);
  });

  it("is too-few when the server returns no rows", async () => {
    await expect(
      fetchFeelingCloud(1, async () => ({ data: [], error: null }))
    ).resolves.toBe("too-few");
  });

  it("is offline on a server error, a bad body or a network failure", async () => {
    await expect(
      fetchFeelingCloud(1, async () => ({
        data: null,
        error: { statusCode: 500 },
      }))
    ).resolves.toBe("offline");
    await expect(
      fetchFeelingCloud(1, async () => ({ data: "oops", error: null }))
    ).resolves.toBe("offline");
    await expect(
      fetchFeelingCloud(1, () => Promise.reject(new Error("network")))
    ).resolves.toBe("offline");
  });
});

describe("fetchFeelingCloud timeout", () => {
  it("is offline when the request hangs past the timeout", async () => {
    vi.useFakeTimers();
    try {
      const hung = vi.fn(
        () => new Promise<{ data: unknown; error: unknown }>(() => {})
      );
      const result = fetchFeelingCloud(112, hung);
      await vi.advanceTimersByTimeAsync(7999);
      let settled = false;
      void result.then(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBeFalsy();
      await vi.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe("offline");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a custom timeout and clears it on a quick answer", async () => {
    vi.useFakeTimers();
    try {
      const quick = vi.fn(async () => ({ data: [], error: null }));
      await expect(fetchFeelingCloud(1, quick, 50)).resolves.toBe("too-few");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe(cloudFontSize, () => {
  const totals = [
    { feeling: "Peaceful", readers: 12 },
    { feeling: "Moved", readers: 2 },
    { feeling: "Curious", readers: 7 },
  ];

  it("scales between the min and max by readers", () => {
    expect(cloudFontSize(12, totals, 16, 36)).toBe(36);
    expect(cloudFontSize(2, totals, 16, 36)).toBe(16);
    expect(cloudFontSize(7, totals, 16, 36)).toBe(26);
  });

  it("uses the middle size when every word has the same readers", () => {
    expect(
      cloudFontSize(5, [{ feeling: "Peaceful", readers: 5 }], 16, 36)
    ).toBe(26);
  });
});

describe(cloudWordLabel, () => {
  it("reads the word and its readers", () => {
    expect(cloudWordLabel({ feeling: "Peaceful", readers: 12 })).toBe(
      "Peaceful, 12 readers"
    );
    expect(cloudWordLabel({ feeling: "Moved", readers: 1 })).toBe(
      "Moved, 1 reader"
    );
  });
});
