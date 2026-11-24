import { describe, expect, it } from "vitest";

import {
  acceptPayload,
  mergeStores,
  pack,
  payloadFromHash,
  unpack,
} from "./move";
import type { Store } from "./move";

const J = "mindfulverse.journal.v1";
const T = "mindfulverse.journal.deleted.v1";
const V = "mindfulverse.visits.v1";
const C = "mindfulverse.circles.v2";

const entry = (id: string, text = id) => ({ createdAt: 1, id, text });

describe("pack and unpack", () => {
  it("round-trips a store, Arabic and emoji included", async () => {
    const store: Store = {
      [J]: JSON.stringify([entry("a", "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا 🤍")]),
      [V]: JSON.stringify(["2026-11-20", "2026-11-21"]),
      "mindfulverse.theme.v1": "dark",
    };
    await expect(unpack(await pack(store))).resolves.toStrictEqual(store);
  });

  it("round-trips a large journal and stays URL safe", async () => {
    const big: Store = {
      [J]: JSON.stringify(
        Array.from({ length: 400 }, (_, i) =>
          entry(
            `id-${i}`,
            `Reflection ${i}: ${"patience and gratitude ".repeat(20)}`
          )
        )
      ),
    };
    const payload = await pack(big);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/u);
    await expect(unpack(payload)).resolves.toStrictEqual(big);
  });

  it("keeps only MindfulVerse string items and rejects anything else", async () => {
    const mixed = await pack({
      "mindfulverse.theme.v1": "light",
      other: "x",
    } as Store);
    await expect(unpack(mixed)).resolves.toStrictEqual({
      "mindfulverse.theme.v1": "light",
    });
    await expect(unpack("not-a-payload")).rejects.toBeInstanceOf(Error);
  });
});

describe(payloadFromHash, () => {
  it("finds the payload only in a move fragment", () => {
    expect(payloadFromHash("#move=abc")).toBe("abc");
    expect(payloadFromHash("move=abc")).toBe("abc");
    expect(payloadFromHash("#v=3")).toBeNull();
    expect(payloadFromHash("")).toBeNull();
  });
});

describe(mergeStores, () => {
  it("copies everything into an empty new address", () => {
    const incoming: Store = {
      [J]: JSON.stringify([entry("a")]),
      "mindfulverse.installId.v1": "install-1",
      "mindfulverse.theme.v1": "dark",
    };
    const writes = mergeStores({}, incoming);
    expect(JSON.parse(writes[J])).toStrictEqual([entry("a")]);
    expect(writes["mindfulverse.installId.v1"]).toBe("install-1");
    expect(writes["mindfulverse.theme.v1"]).toBe("dark");
  });

  it("keeps settings already chosen on the new address", () => {
    const writes = mergeStores(
      { "mindfulverse.theme.v1": "light" },
      { "mindfulverse.theme.v1": "dark" }
    );
    expect(writes["mindfulverse.theme.v1"]).toBeUndefined();
  });

  it("combines journals by id, the new address's copy winning", () => {
    const writes = mergeStores(
      { [J]: JSON.stringify([entry("a", "edited on new"), entry("b")]) },
      { [J]: JSON.stringify([entry("a", "old"), entry("c")]) }
    );
    expect(JSON.parse(writes[J])).toStrictEqual([
      entry("a", "edited on new"),
      entry("b"),
      entry("c"),
    ]);
  });

  it("never brings back an entry deleted on either address", () => {
    const writes = mergeStores(
      {
        [J]: JSON.stringify([entry("b")]),
        [T]: JSON.stringify([{ deletedAt: 2, id: "a" }]),
      },
      {
        [J]: JSON.stringify([entry("a"), entry("b"), entry("c")]),
        [T]: JSON.stringify([{ deletedAt: 3, id: "c" }]),
      }
    );
    expect(JSON.parse(writes[J])).toStrictEqual([entry("b")]);
    expect(
      JSON.parse(writes[T]).map((t: { id: string }) => t.id)
    ).toStrictEqual(["a", "c"]);
  });

  it("is safe to repeat: arriving twice changes nothing", () => {
    const old: Store = {
      [J]: JSON.stringify([entry("a"), entry("b")]),
      [V]: JSON.stringify(["2026-11-20"]),
      "mindfulverse.theme.v1": "dark",
    };
    const once = mergeStores({}, old);
    const twice = mergeStores(once, old);
    expect({ ...once, ...twice }).toStrictEqual(once);
  });

  it("combines visit days so the streak keeps every day", () => {
    const writes = mergeStores(
      { [V]: JSON.stringify(["2026-11-24"]) },
      { [V]: JSON.stringify(["2026-11-22", "2026-11-23", "2026-11-24"]) }
    );
    expect(JSON.parse(writes[V])).toStrictEqual([
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
    ]);
  });

  it("combines circles by code, up to three", () => {
    const c = (code: string) => ({ code, name: code });
    const writes = mergeStores(
      { [C]: JSON.stringify([c("aaaaaa"), c("bbbbbb")]) },
      { [C]: JSON.stringify([c("bbbbbb"), c("cccccc"), c("dddddd")]) }
    );
    expect(
      JSON.parse(writes[C]).map((x: { code: string }) => x.code)
    ).toStrictEqual(["aaaaaa", "bbbbbb", "cccccc"]);
  });

  it("survives damaged lists on either side", () => {
    const writes = mergeStores({ [J]: "not json" }, { [J]: "{}" });
    expect(JSON.parse(writes[J])).toStrictEqual([]);
  });
});

describe(acceptPayload, () => {
  it("takes the first copy from the old address and marks the move", () => {
    expect(
      acceptPayload("mindfulverse.vercel.app", { [J]: "[]" })
    ).toStrictEqual({ markMoved: true, merge: true });
  });

  it("ignores every later copy, so leaving a circle or a draft sticks", () => {
    expect(
      acceptPayload("mindfulverse.vercel.app", {
        "mindfulverse.moved.v1": "2026-11-24",
      })
    ).toStrictEqual({ markMoved: false, merge: false });
  });

  it("refuses a link from any other site", () => {
    expect(acceptPayload("evil.example", {})).toStrictEqual({
      markMoved: false,
      merge: false,
    });
    expect(acceptPayload("mindfulverse.app", { [J]: "[]" })).toStrictEqual({
      markMoved: false,
      merge: false,
    });
  });

  it("without a referrer, fills only an empty new address and leaves the real move possible", () => {
    expect(acceptPayload(null, {})).toStrictEqual({
      markMoved: false,
      merge: true,
    });
    expect(acceptPayload(null, { [J]: "[]" })).toStrictEqual({
      markMoved: false,
      merge: false,
    });
  });
});

describe("what is never carried", () => {
  it("drops sync keys and the moved marker", async () => {
    const payload = await pack({
      "mindfulverse.moved.v1": "x",
      "mindfulverse.sync.adopt.v1": "x",
      "mindfulverse.sync.owner.v1": "someone",
      "mindfulverse.theme.v1": "dark",
    });
    await expect(unpack(payload)).resolves.toStrictEqual({
      "mindfulverse.theme.v1": "dark",
    });
  });
});
