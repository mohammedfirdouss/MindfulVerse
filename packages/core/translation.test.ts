import { describe, expect, it } from "vitest";

import {
  TRANSLATION_CREDIT,
  TRANSLATION_LICENSE,
  TRANSLATION_SOURCE_URL,
} from "./translation";

describe("translation credit", () => {
  it("credits the translator in the exact attribution line", () => {
    expect(TRANSLATION_CREDIT).toBe(
      "English translation by Talal Itani (ClearQuran)."
    );
  });

  it("names the licence and its canonical URL", () => {
    expect(TRANSLATION_LICENSE).toStrictEqual({
      name: "CC BY-NC-ND 4.0",
      url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    });
  });

  it("links the translation source", () => {
    expect(TRANSLATION_SOURCE_URL).toBe("https://www.clearquran.com");
  });
});
