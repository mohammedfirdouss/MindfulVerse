const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
const WWW_PREFIX = "www.";
const RESERVED_SUFFIXES = [".local", ".internal", ".localhost", ".test"];
const META_TAG_PATTERN = /<meta\b[^>]*>/giu;
const META_NAME = "mindfulverse-verification";
const WELL_KNOWN_PATH = "/.well-known/mindfulverse-verify.txt";
const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 64 * 1024;
const TOKEN_PREFIX = "mv-verify-";
const KEY_PREFIX = "mv_";
const TOKEN_BYTES = 24;
const KEY_BYTES = 32;
const HTTP_OK = 200;

export const normalizeDomain = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  let host: string;
  try {
    host = new URL(
      SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`
    ).hostname.toLowerCase();
  } catch {
    return null;
  }
  while (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  if (host.startsWith(WWW_PREFIX)) {
    host = host.slice(WWW_PREFIX.length);
  }
  const isIpLiteral = host.startsWith("[") || IPV4_PATTERN.test(host);
  const isSingleLabel = !host.includes(".");
  const isReserved = RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix));
  if (!host || isIpLiteral || isSingleLabel || isReserved) {
    return null;
  }
  return host;
};

export const originAllowed = (
  origin: string | null,
  domain: string
): boolean => {
  if (origin === null) {
    return true;
  }
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === domain || host.endsWith(`.${domain}`);
};

export const tokenInFile = (body: string, token: string): boolean =>
  body.trim() === token;

const readAttribute = (tag: string, name: string): string | null => {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "iu"
  );
  const match = pattern.exec(tag);
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
};

export const tokenInHtml = (html: string, token: string): boolean => {
  for (const tag of html.match(META_TAG_PATTERN) ?? []) {
    const name = readAttribute(tag, "name")?.trim().toLowerCase();
    if (name === META_NAME && readAttribute(tag, "content")?.trim() === token) {
      return true;
    }
  }
  return false;
};

const cancelQuietly = async (
  stream: { cancel: () => Promise<void> } | null | undefined
): Promise<void> => {
  try {
    await stream?.cancel();
  } catch {
    // Cancelling is best effort.
  }
};

const readLimited = async (res: Response): Promise<string> => {
  if (!res.body) {
    return "";
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BODY_BYTES) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- stream chunks must be read sequentially
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  await cancelQuietly(reader);
  const bytes = new Uint8Array(Math.min(total, MAX_BODY_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const room = bytes.length - offset;
    if (room <= 0) {
      break;
    }
    bytes.set(chunk.subarray(0, room), offset);
    offset += Math.min(chunk.length, room);
  }
  return new TextDecoder().decode(bytes);
};

const fetchBody = async (
  url: string,
  fetchFn: typeof fetch
): Promise<string | null> => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // oxlint-disable-next-line promise/avoid-new -- no promise-returning timer in Web APIs
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, FETCH_TIMEOUT_MS);
  });
  const attempt = (async () => {
    try {
      const res = await fetchFn(url, {
        redirect: "manual",
        signal: controller.signal,
      });
      if (res.status !== HTTP_OK) {
        await cancelQuietly(res.body);
        return null;
      }
      return await readLimited(res);
    } catch {
      return null;
    }
  })();
  try {
    return await Promise.race([attempt, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const checkDomain = async (
  domain: string,
  token: string,
  fetchFn: typeof fetch
): Promise<boolean> => {
  const fileBody = await fetchBody(
    `https://${domain}${WELL_KNOWN_PATH}`,
    fetchFn
  );
  if (fileBody !== null && tokenInFile(fileBody, token)) {
    return true;
  }
  const homeBody = await fetchBody(`https://${domain}/`, fetchFn);
  return homeBody !== null && tokenInHtml(homeBody, token);
};

const randomBase64Url = (byteCount: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

export const newToken = (): string =>
  `${TOKEN_PREFIX}${randomBase64Url(TOKEN_BYTES)}`;

export const newApiKey = (): string =>
  `${KEY_PREFIX}${randomBase64Url(KEY_BYTES)}`;
