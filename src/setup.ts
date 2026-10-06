// Installs the web implementations of the shared core's platform seams.
// Imported first in main.tsx as a side-effect import: ES imports are hoisted,
// so a plain statement in main.tsx would run after its sibling imports.
import { configureData } from "./lib/data";
import { configureSyncTriggers } from "./lib/sync/engine";
import { configureInsforge } from "./lib/sync/insforge";
import { fetchJson } from "./platform/data";
import { webSyncTriggers } from "./platform/syncTriggers";

configureInsforge({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});
configureData(fetchJson);
configureSyncTriggers(webSyncTriggers);
