// Shared InsForge client, created by the host with configureInsforge() at
// startup — the base URL, anon key and platform options (e.g. isServerMode on
// native) come from the app, so this module reads no build-time env.
// On web the SDK auto-detects `insforge_code` in the URL on OAuth return and
// exchanges it for a session, so the client must be created during startup.
import { createClient, type InsForgeClient, type InsForgeConfig } from "@insforge/sdk";

/** Live binding: undefined until configureInsforge() runs. */
export let insforge: InsForgeClient;

export function configureInsforge(config: InsForgeConfig): InsForgeClient {
  insforge = createClient(config);
  return insforge;
}
