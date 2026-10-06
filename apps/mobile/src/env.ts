// Public build-time config. Expo inlines EXPO_PUBLIC_* from apps/mobile/.env
// (see .env.example). Must be read as literal `process.env.EXPO_PUBLIC_X`
// member expressions or Expo's babel transform won't inline them.
export const INSFORGE_URL = process.env.EXPO_PUBLIC_INSFORGE_URL ?? "";
export const INSFORGE_ANON_KEY = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY ?? "";

if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
  console.warn(
    "[env] EXPO_PUBLIC_INSFORGE_URL / EXPO_PUBLIC_INSFORGE_ANON_KEY are not set; " +
      "copy apps/mobile/.env.example to .env. Account and sync will fail.",
  );
}
