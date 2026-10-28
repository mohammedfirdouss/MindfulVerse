import { jsonError, sha256Hex } from "./daily-verse";
import { newApiKey, newToken, normalizeDomain } from "./verify-domain";

export const TERMS_VERSION = "2026-10-28";

export interface KeyDeps {
  now: () => number;
  ip: (req: Request) => string;
  attempt: (bucket: string, day: string, limit: number) => Promise<boolean>;
  savePending: (p: {
    domain: string;
    token: string;
    siteName: string;
    contactEmail: string | null;
    termsVersion: string;
    expiresAt: string;
  }) => Promise<void>;
  loadPending: (
    domain: string,
    token: string
  ) => Promise<{
    siteName: string;
    contactEmail: string | null;
    termsVersion: string;
    expiresAt: string;
  } | null>;
  issueKey: (p: {
    domain: string;
    keyHash: string;
    siteName: string;
    contactEmail: string | null;
    termsVersion: string;
  }) => Promise<void>;
  check: (domain: string, token: string) => Promise<boolean>;
}

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_UNPROCESSABLE = 422;
const HTTP_TOO_MANY_REQUESTS = 429;

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SITE_NAME_MAX = 80;
const IP_ATTEMPT_LIMIT = 20;
const DOMAIN_ATTEMPT_LIMIT = 10;
const DAY_LENGTH = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const corsHeaders = (): Record<string, string> => ({
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
});

const withCors = (res: Response): Response => {
  for (const [name, value] of Object.entries(corsHeaders())) {
    res.headers.set(name, value);
  }
  return res;
};

const fail = (status: number, error: string, message: string): Response =>
  withCors(jsonError(status, error, message));

const ok = (body: unknown): Response =>
  Response.json(body, { headers: corsHeaders(), status: HTTP_OK });

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const handleStart = async (
  body: Record<string, unknown>,
  deps: KeyDeps
): Promise<Response> => {
  if (body.acceptTerms !== true) {
    return fail(
      HTTP_BAD_REQUEST,
      "terms_required",
      "You must accept the terms to get a key."
    );
  }
  const siteName = text(body.siteName);
  if (siteName.length < 1 || siteName.length > SITE_NAME_MAX) {
    return fail(
      HTTP_BAD_REQUEST,
      "invalid_site_name",
      `siteName must be 1-${SITE_NAME_MAX} characters.`
    );
  }
  const domain = normalizeDomain(text(body.siteUrl));
  if (!domain) {
    return fail(
      HTTP_BAD_REQUEST,
      "invalid_domain",
      "siteUrl must be a public https site."
    );
  }
  const email = text(body.contactEmail);
  if (email && !EMAIL_PATTERN.test(email)) {
    return fail(HTTP_BAD_REQUEST, "invalid_email", "contactEmail is invalid.");
  }

  const token = newToken();
  const expiresAt = new Date(deps.now() + TOKEN_TTL_MS).toISOString();
  await deps.savePending({
    contactEmail: email || null,
    domain,
    expiresAt,
    siteName,
    termsVersion: TERMS_VERSION,
    token,
  });
  return ok({
    domain,
    expiresAt,
    fileUrl: `https://${domain}/.well-known/mindfulverse-verify.txt`,
    metaTag: `<meta name="mindfulverse-verification" content="${token}">`,
    token,
  });
};

const handleVerify = async (
  req: Request,
  body: Record<string, unknown>,
  deps: KeyDeps
): Promise<Response> => {
  const domain = normalizeDomain(text(body.domain));
  if (!domain) {
    return fail(HTTP_BAD_REQUEST, "invalid_domain", "domain is invalid.");
  }
  const token = text(body.token);
  const pending = token ? await deps.loadPending(domain, token) : null;
  if (!pending || Date.parse(pending.expiresAt) <= deps.now()) {
    return fail(
      HTTP_NOT_FOUND,
      "no_pending",
      "No pending verification. Start again."
    );
  }

  const day = new Date(deps.now()).toISOString().slice(0, DAY_LENGTH);
  const ipAllowed = await deps.attempt(
    `ip:${deps.ip(req)}`,
    day,
    IP_ATTEMPT_LIMIT
  );
  const domainAllowed = await deps.attempt(
    `domain:${domain}`,
    day,
    DOMAIN_ATTEMPT_LIMIT
  );
  if (!(ipAllowed && domainAllowed)) {
    return fail(
      HTTP_TOO_MANY_REQUESTS,
      "too_many_attempts",
      "Too many attempts today. Try again tomorrow."
    );
  }

  if (!(await deps.check(domain, token))) {
    return fail(
      HTTP_UNPROCESSABLE,
      "not_found_on_site",
      "Verification token not found on your site."
    );
  }

  const apiKey = newApiKey();
  await deps.issueKey({
    contactEmail: pending.contactEmail,
    domain,
    keyHash: await sha256Hex(apiKey),
    siteName: pending.siteName,
    termsVersion: pending.termsVersion,
  });
  return ok({ apiKey, domain });
};

export const handleApiKeys = async (
  req: Request,
  deps: KeyDeps
): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(),
      status: HTTP_NO_CONTENT,
    });
  }
  if (req.method !== "POST") {
    return fail(HTTP_METHOD_NOT_ALLOWED, "method_not_allowed", "Use POST.");
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("not an object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(HTTP_BAD_REQUEST, "bad_request", "Body must be a JSON object.");
  }

  if (body.action === "start") {
    return handleStart(body, deps);
  }
  if (body.action === "verify") {
    return handleVerify(req, body, deps);
  }
  return fail(HTTP_BAD_REQUEST, "bad_request", "Unknown action.");
};
