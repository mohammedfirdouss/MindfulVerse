// Host globals the shared core expects (packages/core/globals.d.ts), installed
// as a side effect of importing this module. setup.ts imports it FIRST: ES
// imports are hoisted, so only import order guarantees these exist before any
// core module evaluates (Phase 0 finding F4).
import * as Crypto from "expo-crypto";
import { installLocalStorage } from "./storage";

installLocalStorage();

// Hermes has no crypto.randomUUID; journal.ts addEntry uses it.
const g = globalThis as { crypto?: { randomUUID?: () => string } };
const c = (g.crypto ??= {});
if (typeof c.randomUUID !== "function") {
  c.randomUUID = () => Crypto.randomUUID();
}
