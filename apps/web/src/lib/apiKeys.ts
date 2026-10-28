// Client for the api-keys edge function: prove you control a site, get a key.

const PLACEHOLDER_BASE = "https://YOUR-PROJECT.insforge.app";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR =
  "We couldn’t reach the server. Check your connection and try again.";

export interface StartInput {
  acceptTerms: true;
  contactEmail?: string;
  siteName: string;
  siteUrl: string;
}

export interface StartResult {
  domain: string;
  expiresAt: string;
  fileUrl: string;
  metaTag: string;
  token: string;
}

export interface VerifyResult {
  apiKey: string;
  domain: string;
}

/** The project base URL, or a placeholder when it is not configured. */
export const functionsBase = (): string => {
  const base = import.meta.env.VITE_INSFORGE_URL;
  return base ? base.replace(/\/+$/u, "") : PLACEHOLDER_BASE;
};

const call = async <T>(body: Record<string, unknown>): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${functionsBase()}/functions/api-keys`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : GENERIC_ERROR;
    throw new Error(message);
  }
  return data as T;
};

export const startVerification = (input: StartInput): Promise<StartResult> =>
  call<StartResult>({ action: "start", ...input });

export const verifyDomain = (
  domain: string,
  token: string
): Promise<VerifyResult> =>
  call<VerifyResult>({ action: "verify", domain, token });
