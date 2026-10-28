import { verseKeyFor } from "../packages/core/dailyVerse";
import {
  TRANSLATION_CREDIT,
  TRANSLATION_LICENSE,
  TRANSLATION_SOURCE_URL,
} from "../packages/core/translation";
import { localDateInZone, localDayIndexInZone } from "./send-reminders";
import { originAllowed } from "./verify-domain";

export interface KeyRecord {
  id: string;
  domain: string;
  revokedAt: string | null;
}

export interface VerseDeps {
  now: () => number;
  findKey: (hash: string) => Promise<KeyRecord | null>;
  hit: (keyId: string, day: string) => Promise<number>;
  verse: (
    verseKey: string
  ) => Promise<{ arabic: string; translation: string; surahName: string }>;
}

export const DAILY_LIMIT = 10_000;

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const MS_PER_SECOND = 1000;
const MAX_DAY_MS = 26 * 60 * 60 * 1000;
const UTC_DATE_LENGTH = 10;
const BEARER_PATTERN = /^Bearer\s+(?<key>\S+)$/iu;
const REFLECT_BASE = "https://mindfulverse.vercel.app/tadabbur";
const BYTE_HEX_WIDTH = 2;
const HEX_RADIX = 16;

const corsHeaders = (origin: string | null): Record<string, string> => ({
  "Access-Control-Allow-Headers": "Authorization, X-Seed",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": origin ?? "*",
  Vary: "Origin",
});

export const jsonError = (
  status: number,
  error: string,
  message: string
): Response =>
  Response.json({ error, message }, { headers: corsHeaders(null), status });

export const sha256Hex = async (s: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(BYTE_HEX_WIDTH, "0"))
    .join("");
};

export const isValidTimeZone = (tz: string): boolean => {
  if (!tz) {
    return false;
  }
  try {
    return Boolean(new Intl.DateTimeFormat("en-US", { timeZone: tz }));
  } catch {
    return false;
  }
};

/** First instant (ms) at which the local calendar date in tz changes. */
const nextLocalMidnight = (nowMs: number, tz: string): number => {
  const today = localDateInZone(nowMs, tz);
  let low = nowMs;
  let high = nowMs + MAX_DAY_MS;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (localDateInZone(mid, tz) === today) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return high;
};

const withCors = (res: Response, origin: string | null): Response => {
  for (const [name, value] of Object.entries(corsHeaders(origin))) {
    res.headers.set(name, value);
  }
  return res;
};

export const handleDailyVerse = async (
  req: Request,
  deps: VerseDeps
): Promise<Response> => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(origin),
      status: HTTP_NO_CONTENT,
    });
  }
  if (req.method !== "GET") {
    return jsonError(HTTP_METHOD_NOT_ALLOWED, "method_not_allowed", "Use GET.");
  }

  const rawKey = BEARER_PATTERN.exec(req.headers.get("Authorization") ?? "")
    ?.groups?.key;
  if (!rawKey) {
    return jsonError(
      HTTP_UNAUTHORIZED,
      "missing_key",
      "Send your key as Authorization: Bearer <key>."
    );
  }
  const record = await deps.findKey(await sha256Hex(rawKey));
  if (!record) {
    return jsonError(HTTP_UNAUTHORIZED, "invalid_key", "Unknown API key.");
  }
  if (record.revokedAt) {
    return jsonError(
      HTTP_UNAUTHORIZED,
      "revoked_key",
      "This API key was revoked."
    );
  }
  if (!originAllowed(origin, record.domain)) {
    return jsonError(
      HTTP_FORBIDDEN,
      "origin_not_allowed",
      "This key is not valid for the requesting origin."
    );
  }

  const tz = new URL(req.url).searchParams.get("tz") ?? "";
  if (!isValidTimeZone(tz)) {
    return withCors(
      jsonError(
        HTTP_BAD_REQUEST,
        "invalid_tz",
        "Pass an IANA time zone as ?tz=, e.g. Africa/Lagos."
      ),
      origin
    );
  }

  const nowMs = deps.now();
  const utcDay = new Date(nowMs).toISOString().slice(0, UTC_DATE_LENGTH);
  if ((await deps.hit(record.id, utcDay)) > DAILY_LIMIT) {
    return withCors(
      jsonError(
        HTTP_TOO_MANY_REQUESTS,
        "rate_limited",
        "Daily request limit reached for this key."
      ),
      origin
    );
  }

  const seed = req.headers.get("X-Seed") ?? "";
  const verseKey = verseKeyFor(localDayIndexInZone(nowMs, tz), seed);
  const [surah, ayah] = verseKey.split(":").map(Number);
  let text: Awaited<ReturnType<VerseDeps["verse"]>>;
  try {
    text = await deps.verse(verseKey);
  } catch {
    return withCors(
      jsonError(
        HTTP_BAD_GATEWAY,
        "upstream_error",
        "Could not load the verse text. Try again shortly."
      ),
      origin
    );
  }
  const validUntilMs = nextLocalMidnight(nowMs, tz);
  const maxAge = Math.max(0, Math.ceil((validUntilMs - nowMs) / MS_PER_SECOND));

  const body = {
    arabic: text.arabic,
    ayah,
    date: localDateInZone(nowMs, tz),
    license: TRANSLATION_LICENSE,
    reflectUrl: `${REFLECT_BASE}/${surah}?v=${ayah}`,
    source: TRANSLATION_SOURCE_URL,
    surah,
    surahName: text.surahName,
    translation: text.translation,
    translationCredit: TRANSLATION_CREDIT,
    validUntil: new Date(validUntilMs).toISOString(),
    verseKey,
  };
  return withCors(
    Response.json(body, {
      headers: { "Cache-Control": `private, max-age=${maxAge}` },
      status: HTTP_OK,
    }),
    origin
  );
};

interface SurahMeta {
  number: number;
  name: string;
}

interface AyahRow {
  ayah: number;
  arabic: string;
  translation: string;
}

const SITE_URL = "https://mindfulverse.vercel.app";

/** Pick one verse's text out of a surah file and the surah list. */
export const pickVerse = (
  verseKey: string,
  ayahs: AyahRow[],
  surahs: SurahMeta[]
): { arabic: string; translation: string; surahName: string } => {
  const [surah, ayah] = verseKey.split(":").map(Number);
  const row = ayahs.find((a) => a.ayah === ayah);
  if (!row) {
    throw new Error(`verse ${verseKey} not found`);
  }
  return {
    arabic: row.arabic,
    surahName: surahs.find((s) => s.number === surah)?.name ?? "",
    translation: row.translation,
  };
};

/** Read the count out of an RPC result; anything unexpected throws so limits fail closed. */
export const rpcCount = (data: unknown): number => {
  if (typeof data === "number" && Number.isFinite(data)) {
    return data;
  }
  if (typeof data === "string" && data.trim() !== "") {
    const n = Number(data);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  if (Array.isArray(data) && data.length === 1) {
    return rpcCount(data[0]);
  }
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const values = Object.values(data);
    if (values.length === 1) {
      return rpcCount(values[0]);
    }
  }
  throw new Error("unexpected rpc result");
};

const surahCache = new Map<number, Promise<AyahRow[]>>();
let surahList: Promise<SurahMeta[]> | null = null;
const getJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${SITE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`fetch ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
};

declare const Deno: { env: { get: (k: string) => string | undefined } };

export default async function handler(req: Request): Promise<Response> {
  try {
    const { createAdminClient } = await import("npm:@insforge/sdk");
    const db = createAdminClient({
      apiKey: Deno.env.get("API_KEY") ?? "",
      baseUrl: Deno.env.get("INSFORGE_BASE_URL") ?? "",
    }).database;

    return await handleDailyVerse(req, {
      findKey: async (hash) => {
        const { data, error } = await db
          .from("api_keys")
          .select("id, domain, revoked_at")
          .eq("key_hash", hash);
        if (error) {
          throw new Error("findKey failed");
        }
        const [row] = data ?? [];
        return row
          ? { domain: row.domain, id: row.id, revokedAt: row.revoked_at }
          : null;
      },
      hit: async (keyId, day) => {
        const { data, error } = await db.rpc("api_hit", {
          p_bucket: `key:${keyId}`,
          p_day: day,
        });
        if (error) {
          throw new Error("hit failed");
        }
        return rpcCount(data);
      },
      now: () => Date.now(),
      verse: async (verseKey) => {
        const [surah] = verseKey.split(":").map(Number);
        const ayahs =
          surahCache.get(surah) ??
          getJson<AyahRow[]>(`/data/quran/${surah}.json`);
        surahCache.set(surah, ayahs);
        surahList ??= getJson<SurahMeta[]>("/data/surahs.json");
        try {
          return pickVerse(verseKey, await ayahs, await surahList);
        } catch (error) {
          surahCache.delete(surah);
          surahList = null;
          throw error;
        }
      },
    });
  } catch {
    return jsonError(
      HTTP_SERVER_ERROR,
      "server_error",
      "Something went wrong. Try again shortly."
    );
  }
}
