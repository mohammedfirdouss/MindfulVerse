import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkDomain,
  newApiKey,
  newToken,
  normalizeDomain,
  originAllowed,
  tokenInFile,
  tokenInHtml,
} from "./verify-domain";

const TOKEN = "mv-verify-abc";
const FILE_URL = "https://example.com/.well-known/mindfulverse-verify.txt";
const HOME_URL = "https://example.com/";
const BASE64URL = /^[A-Za-z0-9_-]+$/u;
const KB = 1024;

const respond = (body: string, status = 200): Response =>
  new Response(body, { status });

describe(normalizeDomain, () => {
  it("strips scheme, path, query, www and lowercases", () => {
    expect(normalizeDomain("https://WWW.IslamicHub.xyz/path?q=1")).toBe(
      "islamichub.xyz"
    );
  });

  it("strips the port", () => {
    expect(normalizeDomain("islamichub.xyz:8443")).toBe("islamichub.xyz");
  });

  it.each([
    "http://127.0.0.1",
    "localhost",
    "intranet",
    "box.local",
    "[::1]",
    "svc.internal",
    "a.localhost",
    "foo.test",
  ])("rejects %s", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe(originAllowed, () => {
  it("allows www subdomain", () => {
    expect(
      originAllowed("https://www.islamichub.xyz", "islamichub.xyz")
    ).toBeTruthy();
  });

  it("rejects look-alike hosts", () => {
    expect(
      originAllowed("https://evilislamichub.xyz", "islamichub.xyz")
    ).toBeFalsy();
    expect(
      originAllowed("https://islamichub.xyz.evil.com", "islamichub.xyz")
    ).toBeFalsy();
  });

  it("allows a missing origin", () => {
    expect(originAllowed(null, "islamichub.xyz")).toBeTruthy();
  });
});

describe(tokenInFile, () => {
  it("matches trimmed body", () => {
    expect(tokenInFile("  tok\r\n", "tok")).toBeTruthy();
  });

  it("rejects partial match", () => {
    expect(tokenInFile("xtok", "tok")).toBeFalsy();
  });
});

describe(tokenInHtml, () => {
  it("matches meta in any attribute order and case", () => {
    expect(
      tokenInHtml(
        '<META content="tok" NAME="mindfulverse-verification">',
        "tok"
      )
    ).toBeTruthy();
  });

  it("rejects other meta names and plain text", () => {
    expect(tokenInHtml('<meta name="other" content="tok">', "tok")).toBeFalsy();
    expect(tokenInHtml("<p>tok</p>", "tok")).toBeFalsy();
  });
});

describe("newToken and newApiKey", () => {
  it("builds a prefixed base64url token of 24 bytes", () => {
    const token = newToken();
    const body = token.slice("mv-verify-".length);
    expect(token.startsWith("mv-verify-")).toBeTruthy();
    expect(body).toMatch(BASE64URL);
    expect(body).toHaveLength(32);
    expect(newToken()).not.toBe(token);
  });

  it("builds a prefixed base64url key of 32 bytes", () => {
    const key = newApiKey();
    const body = key.slice("mv_".length);
    expect(key.startsWith("mv_")).toBeTruthy();
    expect(body).toMatch(BASE64URL);
    expect(body).toHaveLength(43);
    expect(newApiKey()).not.toBe(key);
  });
});

describe(checkDomain, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when the well-known file holds the token", async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.resolve(respond(`${TOKEN}\n`))
    );
    await expect(
      checkDomain("example.com", TOKEN, fetchFn)
    ).resolves.toBeTruthy();
    expect(fetchFn).toHaveBeenCalledWith(
      FILE_URL,
      expect.objectContaining({ redirect: "manual" })
    );
  });

  it("treats a redirect as not found and never follows it", async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(null, {
          headers: { location: "https://evil.example/" },
          status: 301,
        })
      )
    );
    await expect(
      checkDomain("example.com", TOKEN, fetchFn)
    ).resolves.toBeFalsy();
    const urls = fetchFn.mock.calls.map((call) => String(call[0]));
    expect(urls).toStrictEqual([FILE_URL, HOME_URL]);
  });

  it("falls back to the homepage meta tag after a 404", async () => {
    const fetchFn = vi.fn<typeof fetch>((url) =>
      Promise.resolve(
        String(url) === FILE_URL
          ? respond("nope", 404)
          : respond(
              `<html><head><meta name="mindfulverse-verification" content="${TOKEN}"></head></html>`
            )
      )
    );
    await expect(
      checkDomain("example.com", TOKEN, fetchFn)
    ).resolves.toBeTruthy();
  });

  it("ignores a token placed after the first 64 KB", async () => {
    const body = `${"a".repeat(64 * KB)}${"b".repeat(136 * KB)}\n${TOKEN}`;
    const fetchFn = vi.fn<typeof fetch>(() => Promise.resolve(respond(body)));
    await expect(
      checkDomain("example.com", TOKEN, fetchFn)
    ).resolves.toBeFalsy();
  });

  it("returns false within the timeout when fetch never resolves", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>(() => Promise.race<Response>([]));
    const pending = checkDomain("example.com", TOKEN, fetchFn);
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(pending).resolves.toBeFalsy();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns false when fetch throws", async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error("boom"))
    );
    await expect(
      checkDomain("example.com", TOKEN, fetchFn)
    ).resolves.toBeFalsy();
  });
});
