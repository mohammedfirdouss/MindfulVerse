// Shared InsForge client, created by the host with configureInsforge() at
// startup — the base URL, anon key and platform options (e.g. isServerMode on
// native) come from the app, so this module reads no build-time env.
// On web the SDK auto-detects `insforge_code` in the URL on OAuth return and
// exchanges it for a session, so the client must be created during startup.
import { createClient } from "@insforge/sdk";
import type { InsForgeClient, InsForgeConfig } from "@insforge/sdk";

/** Live binding: undefined until configureInsforge() runs. */
// oxlint-disable-next-line import/no-mutable-exports -- live binding set by configureInsforge()
export let insforge: InsForgeClient;

// What sync/currentUser.ts needs to know before it skips the server, read
// here because only this module sees the page before the SDK does: the SDK
// removes insforge_code from the URL as soon as the client is created, and
// keeps a fresh sign-in only in memory.
const OAUTH_CODE_PATTERN = /[?&]insforge_code=/u;
let oauthReturn = false;
let liveSession = false;

/** True when this page load is a return from Google sign-in, or a session
 *  was made or refreshed in this tab and not signed out since. */
export function sessionInProgress(): boolean {
  return oauthReturn || liveSession;
}

export function configureInsforge(config: InsForgeConfig): InsForgeClient {
  const { location } = globalThis as { location?: { search?: string } };
  oauthReturn = OAUTH_CODE_PATTERN.test(location?.search ?? "");
  insforge = createClient(config);
  insforge.auth.onAuthStateChange((event) => {
    liveSession = event !== "signedOut";
  });
  return insforge;
}
