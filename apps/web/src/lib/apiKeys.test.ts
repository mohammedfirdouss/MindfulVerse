import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { functionsBase, startVerification, verifyDomain } from "./apiKeys";

const BASE = "https://example.insforge.app";

const reply = (status: number, body: unknown) =>
  Response.json(body, { status });

const postedBody = (init?: RequestInit): unknown =>
  JSON.parse(String(init?.body));

describe("apiKeys", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("VITE_INSFORGE_URL", BASE);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("posts a start action to the api-keys function", async () => {
    const result = {
      domain: "a.com",
      expiresAt: "x",
      fileUrl: "f",
      metaTag: "m",
      token: "t",
    };
    fetchMock.mockResolvedValue(reply(200, result));
    const input = {
      acceptTerms: true as const,
      siteName: "A",
      siteUrl: "https://a.com",
    };
    await expect(startVerification(input)).resolves.toStrictEqual(result);
    const [[url, init]] = fetchMock.mock.calls;
    expect(url).toBe(`${BASE}/functions/api-keys`);
    expect(init?.method).toBe("POST");
    expect(postedBody(init)).toStrictEqual({ action: "start", ...input });
  });

  it("posts a verify action and returns the key", async () => {
    fetchMock.mockResolvedValue(reply(200, { apiKey: "k", domain: "a.com" }));
    await expect(verifyDomain("a.com", "tok")).resolves.toStrictEqual({
      apiKey: "k",
      domain: "a.com",
    });
    const [[, init]] = fetchMock.mock.calls;
    expect(postedBody(init)).toStrictEqual({
      action: "verify",
      domain: "a.com",
      token: "tok",
    });
  });

  it("throws the server message on a 422", async () => {
    fetchMock.mockResolvedValue(
      reply(422, { error: "bad", message: "That URL is not allowed." })
    );
    await expect(verifyDomain("a.com", "t")).rejects.toThrow(
      "That URL is not allowed."
    );
  });

  it("throws a plain message when the response is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(verifyDomain("a.com", "t")).rejects.toThrow(
      /something went wrong/iu
    );
  });

  it("falls back to a placeholder base when the env var is unset", () => {
    vi.stubEnv("VITE_INSFORGE_URL", "");
    expect(functionsBase()).toBe("https://YOUR-PROJECT.insforge.app");
  });
});
