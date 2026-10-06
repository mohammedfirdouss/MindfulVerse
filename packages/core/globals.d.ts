// Host globals the core relies on — every host must provide these at runtime.
// Web: the browser. Mobile: install shims before importing any core module
// (localStorage over MMKV, crypto.randomUUID over expo-crypto).
//
// Declared minimally so core typechecks without lib.dom. The shapes match
// lib.dom's, so these merge cleanly into a program that does include DOM.

/** Synchronous key-value store. Hosts must keep localStorage's semantics:
 *  getItem returns null for a missing key; setItem may throw (e.g. quota),
 *  and core callers already catch where a failure must not surface. */
interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
declare var localStorage: Storage;

interface Crypto {
  randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
}
declare var crypto: Crypto;

declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(id: number | undefined): void;
