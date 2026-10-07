// globalThis.localStorage over MMKV (synchronous, JSI), so every core module
// that reads or writes localStorage runs unchanged on native.
//
// Semantics kept from the web contract (packages/core/globals.d.ts):
// getItem returns null for a missing key and never throws; removeItem never
// throws; setItem may throw (like a full localStorage) and core callers
// already catch where that must not surface.
type KV = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): unknown;
  clearAll(): void;
};

/** "memory" means MMKV's native module was missing (Expo Go): data won't
 *  survive a restart. Use a development build (see README). */
export let storageBackend: "mmkv" | "memory" = "mmkv";

function openStore(): KV {
  try {
    // require() inside try: in Expo Go the nitro native module is missing and
    // the import itself throws. v4 API: createMMKV() + remove(), not v3's
    // new MMKV() + delete() (F3).
    const { createMMKV } = require("react-native-mmkv") as typeof import("react-native-mmkv");
    return createMMKV({ id: "mindfulverse" });
  } catch (e) {
    storageBackend = "memory";
    console.warn("[storage] MMKV unavailable, falling back to memory:", e);
    const m = new Map<string, string>();
    return {
      getString: (k) => m.get(k),
      set: (k, v) => void m.set(k, v),
      remove: (k) => m.delete(k),
      clearAll: () => m.clear(),
    };
  }
}

export const kv: KV = openStore();

export function installLocalStorage(): void {
  // The web preview (expo start --web) has a real localStorage, and it can't be replaced.
  if (typeof window !== "undefined" && typeof document !== "undefined") return;
  const shim = {
    getItem(key: string): string | null {
      try {
        return kv.getString(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      kv.set(key, String(value));
    },
    removeItem(key: string): void {
      try {
        kv.remove(key);
      } catch {
        /* like localStorage: removing never fails loudly */
      }
    },
    clear(): void {
      kv.clearAll();
    },
  };
  (globalThis as { localStorage?: unknown }).localStorage = shim;
}
