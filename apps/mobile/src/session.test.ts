// session.ts against a fake SDK + SecureStore: the sign-out generation guard,
// and the refresh paths. No RN runtime involved.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (k: string) => store.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void store.set(k, v),
  deleteItemAsync: async (k: string) => void store.delete(k),
}));
vi.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock("@insforge/sdk", () => ({
  AuthChangeEvent: { SIGNED_IN: "SIGNED_IN", TOKEN_REFRESHED: "TOKEN_REFRESHED" },
}));

type Refresh = () => Promise<{ data: unknown; error: { statusCode: number } | null }>;
const fake = vi.hoisted(() => ({
  refresh: null as null | Refresh,
  tokens: [] as (string | null)[],
}));
vi.mock("@mindfulverse/core/sync/insforge", () => ({
  insforge: {
    setAccessToken: (t: string | null) => fake.tokens.push(t),
    getHttpClient: () => ({ setRefreshToken: () => {} }),
    auth: {
      refreshSession: () => fake.refresh!(),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { accessToken: jwt(0, 900), refreshToken: "r1" }, error: null }),
    },
  },
}));

/** An unsigned JWT with the given iat/exp (seconds). */
function jwt(iat: number, exp: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64({ iat, exp })}.sig`;
}

const REFRESH_KEY = "mindfulverse.refreshToken.v1";

async function load() {
  vi.resetModules();
  return import("./session");
}

beforeEach(() => {
  store.clear();
  fake.tokens.length = 0;
  fake.refresh = null;
});
afterEach(() => vi.useRealTimers());

describe("sign-out vs an in-flight refresh", () => {
  it("does not adopt a refresh that resolves after signOut()", async () => {
    const s = await load();
    await s.signIn("a@b.co", "pw");
    expect(s.hasSession()).toBe(true);

    let resolve!: (v: Awaited<ReturnType<Refresh>>) => void;
    fake.refresh = () => new Promise((r) => (resolve = r));
    const pending = s.restore(); // refreshes with the stored token
    await new Promise((r) => setTimeout(r, 0)); // reach refreshSession()

    await s.signOut();
    resolve({ data: { accessToken: jwt(0, 900), refreshToken: "r2" }, error: null });
    await pending;

    expect(s.hasSession()).toBe(false);
    expect(store.has(REFRESH_KEY)).toBe(false);
    expect(fake.tokens.at(-1)).toBeNull();
  });
});
