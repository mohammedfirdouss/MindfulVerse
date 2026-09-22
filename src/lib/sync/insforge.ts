// Shared InsForge client. The SDK auto-detects `insforge_code` in the URL on
// OAuth return and exchanges it for a session, so this module must be imported
// during app startup (it is, via AccountProvider).
import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});
