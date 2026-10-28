import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SAMPLE_ARABIC, SAMPLE_TRANSLATION } from "./sample-verse";

describe("developers sample verse", () => {
  it("matches the app data for 94:6 exactly", () => {
    const file = new URL("../../public/data/quran/94.json", import.meta.url);
    const ayahs: { ayah: number; arabic: string; translation: string }[] =
      JSON.parse(readFileSync(file, "utf-8"));
    const ayah = ayahs.find((a) => a.ayah === 6);
    expect(SAMPLE_ARABIC).toBe(ayah?.arabic);
    expect(SAMPLE_TRANSLATION).toBe(ayah?.translation);
  });
});
