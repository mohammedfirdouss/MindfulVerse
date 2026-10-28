const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
const WWW_PREFIX = "www.";
const RESERVED_SUFFIXES = [".local", ".internal", ".localhost", ".test"];
const INERT_BLOCK_PATTERN =
  /<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->/giu;
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

const SCHEME_CAPTURE = /^(?<scheme>[a-z][a-z0-9+.-]*):\/\//iu;
const ALLOWED_SCHEMES = new Set(["http", "https"]);
const IPV4_PART_COUNT = 4;
const IPV6_GROUP_COUNT = 8;
const HEX_RADIX = 16;
const BYTE_MAX = 255;
const BYTE_RANGE = 256;
const GROUP_ULA = 0xfc_00;
const GROUP_ULA_SPAN = 0x02_00;
const GROUP_LINK_LOCAL = 0xfe_80;
const GROUP_LINK_LOCAL_SPAN = 0x00_40;

const fetchHostname = (host: string): string | null => {
  try {
    return new URL(`https://${host}`).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const normalizeDomain = (input: string): string | null => {
  let rest = input.trim();
  const scheme = SCHEME_CAPTURE.exec(rest);
  if (scheme) {
    if (!ALLOWED_SCHEMES.has((scheme.groups?.scheme ?? "").toLowerCase())) {
      return null;
    }
    rest = rest.slice(scheme[0].length);
  }
  let host = fetchHostname(rest);
  while (host?.endsWith(".")) {
    host = host.slice(0, -1);
  }
  if (host?.startsWith(WWW_PREFIX)) {
    host = host.slice(WWW_PREFIX.length);
  }
  if (!host) {
    return null;
  }
  if (fetchHostname(host) !== host) {
    return null;
  }
  const isIpLiteral = host.startsWith("[") || IPV4_PATTERN.test(host);
  const isSingleLabel = !host.includes(".");
  const isReserved = RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix));
  if (isIpLiteral || isSingleLabel || isReserved) {
    return null;
  }
  return host;
};

const parseIpv4 = (ip: string): number[] | null => {
  const parts = ip.split(".");
  if (parts.length !== IPV4_PART_COUNT) {
    return null;
  }
  const nums = parts.map((part) =>
    /^\d{1,3}$/u.test(part) ? Number(part) : -1
  );
  return nums.every((n) => n >= 0 && n <= BYTE_MAX) ? nums : null;
};

const isPrivateIpv4 = (ip: string): boolean => {
  const nums = parseIpv4(ip);
  if (!nums) {
    return true;
  }
  const [a, b] = nums;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

const toGroups = (part: string): string[] => (part ? part.split(":") : []);

const expandIpv6 = (ip: string): number[] | null => {
  let text = ip;
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);
    if (!v4) {
      return null;
    }
    const hi = (v4[0] * BYTE_RANGE + v4[1]).toString(HEX_RADIX);
    const lo = (v4[2] * BYTE_RANGE + v4[3]).toString(HEX_RADIX);
    text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) {
    return null;
  }
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  const fill = IPV6_GROUP_COUNT - head.length - rest.length;
  if (halves.length === 1 ? fill !== 0 : fill < 1) {
    return null;
  }
  const groups = [
    ...head,
    ...Array.from({ length: halves.length === 2 ? fill : 0 }, () => "0"),
    ...rest,
  ];
  const nums = groups.map((g) =>
    /^[0-9a-f]{1,4}$/iu.test(g) ? Number.parseInt(g, HEX_RADIX) : -1
  );
  return nums.every((n) => n >= 0) ? nums : null;
};

const isPrivateIpv6 = (ip: string): boolean => {
  const g = expandIpv6(ip);
  if (!g) {
    return true;
  }
  const leadingZero = g.slice(0, 5).every((n) => n === 0);
  if (leadingZero && g[5] === 0xff_ff) {
    return isPrivateIpv4(
      `${Math.floor(g[6] / BYTE_RANGE)}.${g[6] % BYTE_RANGE}.${Math.floor(g[7] / BYTE_RANGE)}.${g[7] % BYTE_RANGE}`
    );
  }
  if (leadingZero && g[5] === 0 && g[6] === 0 && g[7] <= 1) {
    return true;
  }
  return (
    (g[0] >= GROUP_ULA && g[0] < GROUP_ULA + GROUP_ULA_SPAN) ||
    (g[0] >= GROUP_LINK_LOCAL &&
      g[0] < GROUP_LINK_LOCAL + GROUP_LINK_LOCAL_SPAN)
  );
};

export const isPrivateAddress = (ip: string): boolean => {
  const trimmed = ip.trim().replaceAll(/^\[|\]$/gu, "");
  return trimmed.includes(":")
    ? isPrivateIpv6(trimmed)
    : isPrivateIpv4(trimmed);
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
  token !== "" && body.trim() === token;

const readAttribute = (tag: string, name: string): string | null => {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    "iu"
  );
  const match = pattern.exec(tag);
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3] ?? null;
};

export const tokenInHtml = (html: string, token: string): boolean => {
  if (token === "") {
    return false;
  }
  const visible = html.replaceAll(INERT_BLOCK_PATTERN, "");
  for (const tag of visible.match(META_TAG_PATTERN) ?? []) {
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

const resolvesPublicly = async (
  domain: string,
  resolve: (host: string) => Promise<string[]>
): Promise<boolean> => {
  try {
    const addresses = await resolve(domain);
    return addresses.length > 0 && !addresses.some(isPrivateAddress);
  } catch {
    return false;
  }
};

const checkHost = async (
  host: string,
  token: string,
  fetchFn: typeof fetch,
  resolve?: (host: string) => Promise<string[]>
): Promise<boolean> => {
  if (resolve && !(await resolvesPublicly(host, resolve))) {
    return false;
  }
  const fileBody = await fetchBody(
    `https://${host}${WELL_KNOWN_PATH}`,
    fetchFn
  );
  if (fileBody !== null && tokenInFile(fileBody, token)) {
    return true;
  }
  const homeBody = await fetchBody(`https://${host}/`, fetchFn);
  return homeBody !== null && tokenInHtml(homeBody, token);
};

export const checkDomain = async (
  domain: string,
  token: string,
  fetchFn: typeof fetch,
  resolve?: (host: string) => Promise<string[]>
): Promise<boolean> => {
  if (normalizeDomain(domain) !== domain) {
    return false;
  }
  if (resolve && !(await resolvesPublicly(domain, resolve))) {
    return false;
  }
  if (await checkHost(domain, token, fetchFn)) {
    return true;
  }
  return checkHost(`${WWW_PREFIX}${domain}`, token, fetchFn, resolve);
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
