import { describe, expect, it, vi } from "vitest";

import {
  TERMS_VERSION,
  clientIp,
  handleApiKeys,
  resolveHost,
} from "./api-keys";
import type { KeyDeps } from "./api-keys";
import { sha256Hex } from "./daily-verse";

const NOW = Date.UTC(2026, 9, 28, 12, 0, 0);
const HOUR_MS = 3_600_000;
const TTL_HOURS = 24;

type Pending = NonNullable<Awaited<ReturnType<KeyDeps["loadPending"]>>>;
type Json = Record<string, string>;

const makeDeps = (overrides: Partial<KeyDeps> = {}) => {
  const store = new Map<string, Pending>();
  const deps: KeyDeps = {
    attempt: vi.fn<KeyDeps["attempt"]>(() => Promise.resolve(true)),
    check: vi.fn<KeyDeps["check"]>(() => Promise.resolve(true)),
    ip: () => "203.0.113.9",
    issueKey: vi.fn<KeyDeps["issueKey"]>(() => Promise.resolve()),
    loadPending: vi.fn<KeyDeps["loadPending"]>((domain, token) =>
      Promise.resolve(store.get(`${domain}|${token}`) ?? null)
    ),
    now: () => NOW,
    savePending: vi.fn<KeyDeps["savePending"]>((p) => {
      store.set(`${p.domain}|${p.token}`, {
        contactEmail: p.contactEmail,
        expiresAt: p.expiresAt,
        siteName: p.siteName,
        termsVersion: p.termsVersion,
      });
      return Promise.resolve();
    }),
    ...overrides,
  };
  return deps;
};

const post = (body: unknown) =>
  new Request("https://x.test/api-keys", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    method: "POST",
  });

const call = async (deps: KeyDeps, body: unknown) => {
  const res = await handleApiKeys(post(body), deps);
  const json = (await res.json()) as Json;
  return { json, status: res.status };
};

const startBody = {
  acceptTerms: true,
  action: "start",
  contactEmail: "me@example.com",
  siteName: "  My Site ",
  siteUrl: "https://Example.com/path",
};

const verifyBody = (token: string) => ({
  action: "verify",
  domain: "example.com",
  token,
});

const started = async (deps: KeyDeps) => {
  const { json } = await call(deps, startBody);
  return json.token;
};

describe("handleApiKeys start", () => {
  it("returns the proof instructions and saves the pending row", async () => {
    const deps = makeDeps();
    const { json, status } = await call(deps, startBody);
    expect(status).toBe(200);
    expect(json).toStrictEqual({
      domain: "example.com",
      expiresAt: new Date(NOW + TTL_HOURS * HOUR_MS).toISOString(),
      fileUrl: "https://example.com/.well-known/mindfulverse-verify.txt",
      metaTag: `<meta name="mindfulverse-verification" content="${json.token}">`,
      token: json.token,
    });
    expect(deps.savePending).toHaveBeenCalledWith(
      expect.objectContaining({
        contactEmail: "me@example.com",
        siteName: "My Site",
        termsVersion: TERMS_VERSION,
      })
    );
  });

  it("rate limits start per IP before saving", async () => {
    const allowed = makeDeps();
    await call(allowed, startBody);
    expect(allowed.attempt).toHaveBeenCalledWith(
      "start-ip:203.0.113.9",
      "2026-10-28",
      20
    );
    const denied = makeDeps({
      attempt: vi.fn<KeyDeps["attempt"]>(() => Promise.resolve(false)),
    });
    const { json, status } = await call(denied, startBody);
    expect(status).toBe(429);
    expect(json.error).toBe("too_many_attempts");
    expect(denied.savePending).not.toHaveBeenCalled();
  });

  it("requires accepted terms", async () => {
    const { json, status } = await call(makeDeps(), {
      ...startBody,
      acceptTerms: false,
    });
    expect(status).toBe(400);
    expect(json.error).toBe("terms_required");
  });

  it("rejects an invalid domain", async () => {
    const { json, status } = await call(makeDeps(), {
      ...startBody,
      siteUrl: "http://localhost",
    });
    expect(status).toBe(400);
    expect(json.error).toBe("invalid_domain");
  });

  it("rejects blank and overlong site names", async () => {
    const deps = makeDeps();
    const blank = await call(deps, { ...startBody, siteName: "   " });
    const long = await call(deps, { ...startBody, siteName: "a".repeat(81) });
    expect(blank.json.error).toBe("invalid_site_name");
    expect(long.json.error).toBe("invalid_site_name");
  });

  it("rejects a malformed contact email", async () => {
    const { json, status } = await call(makeDeps(), {
      ...startBody,
      contactEmail: "nope",
    });
    expect(status).toBe(400);
    expect(json.error).toBe("invalid_email");
  });

  it("stores a null contact email when empty", async () => {
    const deps = makeDeps();
    await call(deps, { ...startBody, contactEmail: "" });
    expect(deps.savePending).toHaveBeenCalledWith(
      expect.objectContaining({ contactEmail: null })
    );
  });
});

describe("handleApiKeys verify", () => {
  it("issues a key and stores only its hash", async () => {
    const deps = makeDeps();
    const token = await started(deps);
    const { json, status } = await call(deps, verifyBody(token));
    expect(status).toBe(200);
    expect(json.domain).toBe("example.com");
    expect(json.apiKey.startsWith("mv_")).toBeTruthy();
    const [[issued]] = vi.mocked(deps.issueKey).mock.calls;
    expect(issued.keyHash).toBe(await sha256Hex(json.apiKey));
    expect(JSON.stringify(issued)).not.toContain(json.apiKey);
  });

  it("treats an expired pending row as no_pending", async () => {
    const deps = makeDeps({
      loadPending: vi.fn<KeyDeps["loadPending"]>(() =>
        Promise.resolve({
          contactEmail: null,
          expiresAt: new Date(NOW - 1).toISOString(),
          siteName: "S",
          termsVersion: TERMS_VERSION,
        })
      ),
    });
    const { json, status } = await call(deps, verifyBody("t"));
    expect(status).toBe(404);
    expect(json.error).toBe("no_pending");
    expect(deps.check).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown token", async () => {
    const { status } = await call(makeDeps(), verifyBody("zzz"));
    expect(status).toBe(404);
  });

  it("returns 422 when the proof is not on the site", async () => {
    const deps = makeDeps({
      check: vi.fn<KeyDeps["check"]>(() => Promise.resolve(false)),
    });
    const token = await started(deps);
    const { json, status } = await call(deps, verifyBody(token));
    expect(status).toBe(422);
    expect(json.error).toBe("not_found_on_site");
    expect(deps.issueKey).not.toHaveBeenCalled();
  });

  it("returns 429 before fetching when a bucket is exhausted", async () => {
    const attempt = vi.fn<KeyDeps["attempt"]>((bucket) =>
      Promise.resolve(!bucket.startsWith("domain:"))
    );
    const deps = makeDeps({ attempt });
    const token = await started(deps);
    const { json, status } = await call(deps, verifyBody(token));
    expect(status).toBe(429);
    expect(json.error).toBe("too_many_attempts");
    expect(deps.check).not.toHaveBeenCalled();
    expect(attempt).toHaveBeenCalledWith("ip:203.0.113.9", "2026-10-28", 20);
    expect(attempt).toHaveBeenCalledWith(
      "domain:example.com",
      "2026-10-28",
      10
    );
  });

  it("issues a fresh key on every successful verify", async () => {
    const deps = makeDeps();
    const token = await started(deps);
    const first = await call(deps, verifyBody(token));
    const second = await call(deps, verifyBody(token));
    expect(first.json.apiKey).not.toBe(second.json.apiKey);
    expect(deps.issueKey).toHaveBeenCalledTimes(2);
  });
});

describe("handleApiKeys transport", () => {
  it("rejects malformed JSON and unknown actions", async () => {
    const deps = makeDeps();
    const malformed = await call(deps, "{nope");
    const unknown = await call(deps, { action: "x" });
    expect(malformed.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(unknown.json.error).toBe("bad_request");
  });

  it("rejects non-POST and answers OPTIONS", async () => {
    const deps = makeDeps();
    const get = await handleApiKeys(new Request("https://x.test/"), deps);
    const options = await handleApiKeys(
      new Request("https://x.test/", { method: "OPTIONS" }),
      deps
    );
    expect(get.status).toBe(405);
    expect(options.status).toBe(204);
    expect(options.headers.get("Access-Control-Allow-Methods")).toBe(
      "POST, OPTIONS"
    );
  });
});

describe("handleApiKeys conflicts", () => {
  it("maps a unique violation from issueKey to 409 conflict", async () => {
    const issueKey = vi.fn<KeyDeps["issueKey"]>(() =>
      Promise.reject(
        new Error(
          'duplicate key value violates unique constraint "api_keys_domain_key"'
        )
      )
    );
    const deps = makeDeps({ issueKey });
    const token = await started(deps);
    const { json, status } = await call(deps, verifyBody(token));
    expect(status).toBe(409);
    expect(json.error).toBe("conflict");
  });
});

const withHeader = (value?: string) =>
  new Request("https://x.test/", {
    headers: value === undefined ? {} : { "x-forwarded-for": value },
  });

const okDns = (_host: string, type: "A" | "AAAA") =>
  Promise.resolve(type === "A" ? ["93.184.216.34"] : ["2606:2800::1"]);

const halfDns = (_host: string, type: "A" | "AAAA") =>
  type === "A"
    ? Promise.resolve(["93.184.216.34"])
    : Promise.reject(new Error("no AAAA"));

const deadDns = () => Promise.reject(new Error("nxdomain"));

describe(clientIp, () => {
  it("returns a single entry", () => {
    expect(clientIp(withHeader("203.0.113.9"))).toBe("203.0.113.9");
  });

  it("returns the last entry, trimmed", () => {
    expect(clientIp(withHeader("1.1.1.1, 2.2.2.2 ,  203.0.113.9 "))).toBe(
      "203.0.113.9"
    );
  });

  it("falls back to unknown", () => {
    expect(clientIp(withHeader())).toBe("unknown");
    expect(clientIp(withHeader(" "))).toBe("unknown");
  });
});

describe(resolveHost, () => {
  it("concatenates A and AAAA records", async () => {
    await expect(resolveHost("example.com", okDns)).resolves.toStrictEqual([
      "93.184.216.34",
      "2606:2800::1",
    ]);
  });

  it("treats one failing record type as no records", async () => {
    await expect(resolveHost("example.com", halfDns)).resolves.toStrictEqual([
      "93.184.216.34",
    ]);
  });

  it("throws when both lookups fail", async () => {
    await expect(resolveHost("example.com", deadDns)).rejects.toThrow(
      "dns lookup failed"
    );
  });
});
