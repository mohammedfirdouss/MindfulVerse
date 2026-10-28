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
  const text = await deps.verse(verseKey);
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
