// Moving to mindfulverse.app without losing anything. Everything the app
// keeps in the browser (journal, progress, streak, circles, settings) lives
// in localStorage, which belongs to one address. So the old address never
// just forwards: it first packs every "mindfulverse." item into the new
// address's URL fragment, and the new address unpacks it before the app
// starts, then reloads clean.
//
// The fragment never reaches a server. Only a payload that came from the
// old address is used, and only the first one (see acceptPayload). It only
// fills in or merges:
// what is already on the new address wins, journal entries and deletions are
// combined by id, and visit days are combined, so arriving twice (or after
// using the new address first) never duplicates or brings back a deleted
// entry. The old address keeps its copy untouched.

export const OLD_HOST = "mindfulverse.vercel.app";
export const NEW_ORIGIN = "https://mindfulverse.app";
export const STORE_PREFIX = "mindfulverse.";
const MOVE_PARAM = "move=";
/** Above this the fragment risks being cut by a browser; stay put instead. */
export const MAX_PAYLOAD_CHARS = 500_000;
/** Set on the new address after the first move; later copies are ignored. */
export const MOVED_KEY = "mindfulverse.moved.v1";
/** Never carried: they bind local data to an account, and a forged link
 *  must not be able to switch accounts or stop backup. Sync rebuilds them. */
const NEVER_CARRIED_PREFIX = "mindfulverse.sync.";

const JOURNAL_KEY = "mindfulverse.journal.v1";
const TOMBSTONES_KEY = "mindfulverse.journal.deleted.v1";
const VISITS_KEY = "mindfulverse.visits.v1";
const CIRCLES_KEY = "mindfulverse.circles.v2";
const MAX_CIRCLES = 3;

export type Store = Record<string, string>;

// ---- packing ----

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/[=]+$/u, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replaceAll("-", "+").replaceAll("_", "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** The store as a short, URL-safe string (gzip, then base64url). */
export async function pack(store: Store): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(store));
  return toBase64Url(await pipe(json, new CompressionStream("gzip")));
}

/** The store back from pack(); throws on anything that isn't one. */
export async function unpack(payload: string): Promise<Store> {
  const json = await pipe(
    fromBase64Url(payload),
    new DecompressionStream("gzip")
  );
  const value: unknown = JSON.parse(new TextDecoder().decode(json));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Not a MindfulVerse store");
  }
  const store: Store = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      key.startsWith(STORE_PREFIX) &&
      !key.startsWith(NEVER_CARRIED_PREFIX) &&
      key !== MOVED_KEY &&
      typeof item === "string"
    ) {
      store[key] = item;
    }
  }
  return store;
}

/** The payload carried in a URL fragment, if there is one. */
export function payloadFromHash(hash: string): string | null {
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  return body.startsWith(MOVE_PARAM) ? body.slice(MOVE_PARAM.length) : null;
}

// ---- merging ----

function parseArray(raw: string | undefined): unknown[] {
  if (raw === undefined) {
    return [];
  }
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const idOf = (item: unknown, field: string): string | null => {
  const value = (item as Record<string, unknown> | null)?.[field];
  return typeof value === "string" ? value : null;
};

/** Items from both lists, one per key; the first list's copy wins. */
function unionBy(
  first: unknown[],
  second: unknown[],
  field: string
): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of [...first, ...second]) {
    const id = idOf(item, field);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(item);
  }
  return out;
}

/**
 * The writes that bring `incoming` (from the old address) into `current`
 * (the new address) without losing either side.
 */
export function mergeStores(current: Store, incoming: Store): Store {
  const writes: Store = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (current[key] === undefined) {
      writes[key] = value;
    }
  }

  const tombstones = unionBy(
    parseArray(current[TOMBSTONES_KEY]),
    parseArray(incoming[TOMBSTONES_KEY]),
    "id"
  );
  const deleted = new Set(tombstones.map((t) => idOf(t, "id")));
  if (incoming[TOMBSTONES_KEY] !== undefined) {
    writes[TOMBSTONES_KEY] = JSON.stringify(tombstones);
  }
  if (incoming[JOURNAL_KEY] !== undefined) {
    const entries = unionBy(
      parseArray(current[JOURNAL_KEY]),
      parseArray(incoming[JOURNAL_KEY]),
      "id"
    ).filter((e) => !deleted.has(idOf(e, "id")));
    writes[JOURNAL_KEY] = JSON.stringify(entries);
  }
  if (incoming[VISITS_KEY] !== undefined) {
    const days = new Set(
      [
        ...parseArray(current[VISITS_KEY]),
        ...parseArray(incoming[VISITS_KEY]),
      ].filter((d): d is string => typeof d === "string")
    );
    writes[VISITS_KEY] = JSON.stringify([...days].sort().slice(-366));
  }
  if (
    incoming[CIRCLES_KEY] !== undefined &&
    current[CIRCLES_KEY] !== undefined
  ) {
    writes[CIRCLES_KEY] = JSON.stringify(
      unionBy(
        parseArray(current[CIRCLES_KEY]),
        parseArray(incoming[CIRCLES_KEY]),
        "code"
      ).slice(0, MAX_CIRCLES)
    );
  }
  return writes;
}

// ---- the browser side ----

function readStore(): Store {
  const store: Store = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORE_PREFIX)) {
      store[key] = localStorage.getItem(key) ?? "";
    }
  }
  return store;
}

/**
 * Run before the app starts. On the old address it sends the visitor, and
 * everything they saved, to the new one. On the new address it unpacks what
 * arrived and reloads clean. Resolves to true when the page is leaving, so
 * the app should not start.
 */
/**
 * Whether a payload may be merged. It must have come from the old address
 * (the browser reports it as the referrer), and only the first one counts:
 * after that the old address's frozen copy would undo leaving a circle or
 * clearing a draft. A link with no referrer is accepted only by a new address
 * that has nothing saved yet, and does not count as the move, so the real
 * one can still follow.
 */
export function acceptPayload(
  fromHost: string | null,
  current: Store
): { merge: boolean; markMoved: boolean } {
  if (current[MOVED_KEY] !== undefined) {
    return { markMoved: false, merge: false };
  }
  if (fromHost === OLD_HOST) {
    return { markMoved: true, merge: true };
  }
  const fresh = Object.keys(current).length === 0;
  return { markMoved: false, merge: fromHost === null && fresh };
}

function referrerHost(): string | null {
  try {
    return document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    return null;
  }
}

/**
 * Run before the app starts. On the old address it sends the visitor, and
 * everything they saved, to the new one. On the new address it unpacks what
 * arrived and reloads clean. Resolves to true when the page is leaving, so
 * the app should not start.
 */
export async function moveToNewAddress(): Promise<boolean> {
  try {
    const { hash, hostname, pathname, search } = window.location;
    if (hostname === OLD_HOST) {
      const store = readStore();
      const target = `${NEW_ORIGIN}${pathname}${search}`;
      if (Object.keys(store).length === 0) {
        window.location.replace(target);
        return true;
      }
      const payload = await pack(store);
      if (payload.length > MAX_PAYLOAD_CHARS) {
        // Too big to carry safely in a link: stay, so nothing is stranded.
        return false;
      }
      window.location.replace(`${target}#${MOVE_PARAM}${payload}`);
      return true;
    }

    const payload = payloadFromHash(hash);
    if (payload === null) {
      return false;
    }
    try {
      // Unpack first, then read: an entry saved in another tab meanwhile is
      // part of what gets merged instead of being overwritten.
      const incoming = await unpack(payload);
      const current = readStore();
      const { merge, markMoved } = acceptPayload(referrerHost(), current);
      if (merge) {
        for (const [key, value] of Object.entries(
          mergeStores(current, incoming)
        )) {
          localStorage.setItem(key, value);
        }
      }
      if (markMoved) {
        localStorage.setItem(MOVED_KEY, new Date().toISOString());
      }
    } catch {
      // A damaged link: start normally rather than lose the visit.
    }
    // Reload without the fragment so every part of the app reads the
    // merged store from the start, and the data leaves the address bar.
    window.location.replace(`${pathname}${search}`);
    return true;
  } catch {
    return false;
  }
}
