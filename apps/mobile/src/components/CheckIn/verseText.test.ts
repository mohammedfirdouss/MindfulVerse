import { describe, expect, it } from "vitest";
import { verseText } from "./verseText";

describe("verseText", () => {
  it("matches web's shared-verse format", () => {
    expect(
      verseText({ arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", translation: "So with hardship comes ease.", surah: 94, ayah: 5 }),
    ).toBe(
      "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا\n\n“So with hardship comes ease.”\n\n— Qur’an 94:5\n\nvia MindfulVerse",
    );
  });
});
