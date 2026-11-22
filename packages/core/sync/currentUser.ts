// getCurrentUser() without the wasted round-trip for people who never signed
// in. On the web the SDK keeps the access token in memory only, so on every
// page load it asks the server to refresh the session from its httpOnly
// cookie. For a visitor who never signed in, that request always fails with a
// 401, which shows up as console errors on every visit.
//
// We can't read the httpOnly cookie, but a session leaves two traces we can
// read: the SDK's own CSRF cookie on this site (set at sign-in and on every
// refresh, cleared at sign-out) and the sync owner stamp (set by the first
// successful sync, kept after sign-out). sessionInProgress() covers the
// rest: a return from Google sign-in, and a session made in this tab. With
// none of these, nobody has signed in on this device, so the answer is
// "signed out" without asking the server.
// React Native has no document, and keeps its session another way, so it
// always goes through the SDK as before.
import { insforge, sessionInProgress } from "./insforge";

export const SYNC_OWNER_KEY = "mindfulverse.sync.owner.v1";
const CSRF_COOKIE = "insforge_csrf_token";
// Core is shared with React Native and has no DOM types: read the browser
// globals it needs through this narrow shape.
interface BrowserGlobals {
  document?: { cookie: string };
}

export interface SessionTraces {
  cookie: string;
  syncOwner: string | null;
  /** A Google sign-in return, or a session made in this tab. */
  inProgress: boolean;
}

/** False only when nothing on this device shows a session ever existed. */
export function mightHaveSession(t: SessionTraces): boolean {
  const hasCsrf = t.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${CSRF_COOKIE}=`));
  return hasCsrf || Boolean(t.syncOwner) || t.inProgress;
}

function readTraces(): SessionTraces | null {
  const { document: doc } = globalThis as BrowserGlobals;
  if (!doc) {
    return null;
  }
  let syncOwner: string | null = null;
  try {
    syncOwner = localStorage.getItem(SYNC_OWNER_KEY);
  } catch {
    // Storage blocked: assume a session might exist and ask the server.
    syncOwner = "unknown";
  }
  return {
    cookie: doc.cookie,
    inProgress: sessionInProgress(),
    syncOwner,
  };
}

type CurrentUserResult = Awaited<
  ReturnType<typeof insforge.auth.getCurrentUser>
>;

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const traces = readTraces();
  if (traces && !mightHaveSession(traces)) {
    return { data: { user: null }, error: null };
  }
  return await insforge.auth.getCurrentUser();
}
