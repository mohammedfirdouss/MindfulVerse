import { describe, expect, it } from "vitest";

import { verseKeyFor } from "../packages/core/dailyVerse";
import {
  TRANSLATION_CREDIT,
  TRANSLATION_LICENSE,
  TRANSLATION_SOURCE_URL,
} from "../packages/core/translation";
import type { KeyRecord, VerseDeps } from "./daily-verse";
import {
  DAILY_LIMIT,
  handleDailyVerse,
  isValidTimeZone,
  sha256Hex,
} from "./daily-verse";
import { localDayIndexInZone } from "./send-reminders";

const API_KEY = "mv_testkey";
const HTTP_OK = 200;
const LAGOS = "Africa/Lagos";
const NEW_YORK = "America/New_York";
const DAY_MS = 86_400_000;
const NOON = Date.UTC(2026, 9, 28, 12);

interface Spies {
  findKeyArgs: string[];
  hitArgs: [string, string][];
}

interface Body {
  arabic: string;
  ayah: number;
  date: string;
  error?: string;
  license: { name: string; url: string };
  reflectUrl: string;
  source: string;
  surah: number;
  surahName: string;
  translationCredit: string;
  validUntil: string;
  verseKey: string;
}

const makeDeps = (
  nowMs: number,
  overrides: Partial<VerseDeps> = {},
  record: Partial<KeyRecord> = {}
): { deps: VerseDeps; spies: Spies } => {
  const spies: Spies = { findKeyArgs: [], hitArgs: [] };
  const deps: VerseDeps = {
    findKey: async (hash) => {
      spies.findKeyArgs.push(hash);
      const expected = await sha256Hex(API_KEY);
      if (hash !== expected) {
        return null;
      }
      return {
        domain: "islamichub.xyz",
        id: "key-1",
        revokedAt: null,
        ...record,
      };
    },
    hit: (keyId, day) => {
      spies.hitArgs.push([keyId, day]);
      return Promise.resolve(1);
    },
    now: () => nowMs,
    verse: () =>
      Promise.resolve({
        arabic: "ar",
        surahName: "The Expanse",
        translation: "en",
      }),
    ...overrides,
  };
  return { deps, spies };
};

interface CallOptions {
  tz?: string | null;
  seed?: string;
  key?: string | null;
  origin?: string;
  method?: string;
}

const call = (
  deps: VerseDeps,
  options: CallOptions = {}
): Promise<Response> => {
  const { tz = LAGOS, seed, key = API_KEY, origin, method = "GET" } = options;
  const headers = new Headers();
  if (key !== null) {
    headers.set("Authorization", `Bearer ${key}`);
  }
  if (seed !== undefined) {
    headers.set("X-Seed", seed);
  }
  if (origin !== undefined) {
    headers.set("Origin", origin);
  }
  const query = tz === null ? "" : `?tz=${encodeURIComponent(tz)}`;
  return handleDailyVerse(
    new Request(`https://api.example/daily-verse${query}`, { headers, method }),
    deps
  );
};

const callJson = async (
  nowMs: number,
  options: CallOptions = {},
  overrides: Partial<VerseDeps> = {}
): Promise<{ body: Body; res: Response }> => {
  const { deps } = makeDeps(nowMs, overrides);
  const res = await call(deps, options);
  const body = (await res.json()) as Body;
  return { body, res };
};

describe("verse parity with the app", () => {
  it("matches across local midnight", async () => {
    const before = Date.UTC(2026, 9, 28, 22, 59);
    const after = Date.UTC(2026, 9, 28, 23, 1);
    const results = await Promise.all(
      [before, after].map((t) => callJson(t, { seed: "user-123" }))
    );
    expect(results[0].body.verseKey).toBe(
      verseKeyFor(localDayIndexInZone(before, LAGOS), "user-123")
    );
    expect(results[1].body.verseKey).toBe(
      verseKeyFor(localDayIndexInZone(after, LAGOS), "user-123")
    );
    expect(results.map((r) => r.body.date)).toStrictEqual([
      "2026-10-28",
      "2026-10-29",
    ]);
  });

  it("matches on a DST day", async () => {
    const instants = [
      Date.UTC(2026, 10, 1, 3, 59),
      Date.UTC(2026, 10, 1, 4, 1),
      Date.UTC(2026, 10, 1, 5, 1),
      Date.UTC(2026, 10, 2, 3, 59),
      Date.UTC(2026, 10, 2, 4, 1),
      Date.UTC(2026, 10, 2, 5, 1),
    ];
    const results = await Promise.all(
      instants.map((t) => callJson(t, { seed: "user-123", tz: NEW_YORK }))
    );
    const actual = results.map((r) => r.body.verseKey);
    const expected = instants.map((t) =>
      verseKeyFor(localDayIndexInZone(t, NEW_YORK), "user-123")
    );
    expect(actual).toStrictEqual(expected);
  });

  it("uses an empty seed when X-Seed is absent", async () => {
    const [first, second] = await Promise.all([
      callJson(NOON),
      callJson(NOON + 1000),
    ]);
    expect(first.body.verseKey).toBe(second.body.verseKey);
    expect(first.body.verseKey).toBe(
      verseKeyFor(localDayIndexInZone(NOON, LAGOS), "")
    );
  });
});

describe("response shape", () => {
  it("sets validUntil and max-age to the next local midnight", async () => {
    const { body, res } = await callJson(NOON);
    expect(body.validUntil).toBe("2026-10-28T23:00:00.000Z");
    expect(res.headers.get("Cache-Control")).toContain("max-age=39600");
  });

  it("carries credit, licence and source", async () => {
    const { body } = await callJson(NOON);
    expect(body.translationCredit).toBe(TRANSLATION_CREDIT);
    expect(body.license).toStrictEqual(TRANSLATION_LICENSE);
    expect(body.source).toBe(TRANSLATION_SOURCE_URL);
  });

  it("passes the walked verse key to the verse lookup", async () => {
    let asked = "";
    const { body } = await callJson(
      NOON,
      {},
      {
        verse: (verseKey) => {
          asked = verseKey;
          return Promise.resolve({
            arabic: "ar",
            surahName: "Ash-Sharh",
            translation: "en",
          });
        },
      }
    );
    expect(asked).toBe(body.verseKey);
    expect(body.arabic).toBe("ar");
    expect(body.surahName).toBe("Ash-Sharh");
  });

  it("builds the 94:5 reflect link", async () => {
    let t = NOON;
    while (verseKeyFor(localDayIndexInZone(t, LAGOS), "") !== "94:5") {
      t += DAY_MS;
    }
    const { body } = await callJson(t);
    expect(body.verseKey).toBe("94:5");
    expect(body.surah).toBe(94);
    expect(body.ayah).toBe(5);
    expect(body.reflectUrl).toBe(
      "https://mindfulverse.vercel.app/tadabbur/94?v=5"
    );
  });
});

describe("errors", () => {
  it("401 missing_key", async () => {
    const { body, res } = await callJson(NOON, { key: null });
    expect(res.status).toBe(401);
    expect(body.error).toBe("missing_key");
  });

  it("401 invalid_key", async () => {
    const { body, res } = await callJson(NOON, { key: "mv_nope" });
    expect(res.status).toBe(401);
    expect(body.error).toBe("invalid_key");
  });

  it("401 revoked_key", async () => {
    const { deps } = makeDeps(NOON, {}, { revokedAt: "2026-10-01T00:00:00Z" });
    const res = await call(deps);
    const body = (await res.json()) as Body;
    expect(res.status).toBe(401);
    expect(body.error).toBe("revoked_key");
  });

  it("400 invalid_tz for a missing zone", async () => {
    const { body, res } = await callJson(NOON, { tz: null });
    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_tz");
  });

  it("400 invalid_tz for a bogus zone", async () => {
    const { body, res } = await callJson(NOON, { tz: "Mars/Base" });
    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_tz");
  });

  it("429 rate_limited above the daily limit", async () => {
    const { body, res } = await callJson(
      NOON,
      {},
      { hit: () => Promise.resolve(DAILY_LIMIT + 1) }
    );
    expect(res.status).toBe(429);
    expect(body.error).toBe("rate_limited");
  });

  it("serves the request at exactly the daily limit", async () => {
    const { res } = await callJson(
      NOON,
      {},
      { hit: () => Promise.resolve(DAILY_LIMIT) }
    );
    expect(res.status).toBe(HTTP_OK);
  });

  it("204 on OPTIONS with CORS headers", async () => {
    const res = await call(makeDeps(NOON).deps, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("X-Seed");
  });

  it("405 on POST", async () => {
    const res = await call(makeDeps(NOON).deps, { method: "POST" });
    expect(res.status).toBe(405);
  });
});

describe("origin", () => {
  it("403 origin_not_allowed for a foreign origin", async () => {
    const { body, res } = await callJson(NOON, {
      origin: "https://evil.example",
    });
    expect(res.status).toBe(403);
    expect(body.error).toBe("origin_not_allowed");
  });

  it("allows a matching origin and echoes it", async () => {
    const { res } = await callJson(NOON, {
      origin: "https://app.islamichub.xyz",
    });
    expect(res.status).toBe(HTTP_OK);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.islamichub.xyz"
    );
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("allows requests without an Origin", async () => {
    const { res } = await callJson(NOON);
    expect(res.status).toBe(HTTP_OK);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("privacy and helpers", () => {
  it("never passes seed or tz to findKey or hit", async () => {
    const { deps, spies } = makeDeps(NOON);
    await call(deps, { seed: "secret-seed", tz: NEW_YORK });
    const seen = JSON.stringify([spies.findKeyArgs, spies.hitArgs]);
    expect(seen).not.toContain("secret-seed");
    expect(seen).not.toContain(NEW_YORK);
    expect(spies.hitArgs).toStrictEqual([["key-1", "2026-10-28"]]);
  });

  it("sha256Hex matches the known digest of abc", async () => {
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("isValidTimeZone accepts IANA zones only", () => {
    expect(isValidTimeZone(LAGOS)).toBeTruthy();
    expect(isValidTimeZone("Mars/Base")).toBeFalsy();
    expect(isValidTimeZone("")).toBeFalsy();
  });
});
