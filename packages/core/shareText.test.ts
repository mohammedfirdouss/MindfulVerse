import { describe, expect, it } from "vitest";

import { surahNameInTime, verseShareText, verseUrl } from "./shareText";

const ayah = {
  arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
  ayah: 5,
  surah: 94,
  translation: "So with hardship comes ease.",
};

describe(verseShareText, () => {
  it("gives the verse, its place, the credit and a link", () => {
    expect(verseShareText(ayah, "Ash-Sharh")).toBe(
      [
        "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
        "",
        "“So with hardship comes ease.”",
        "",
        "Qur’an, Ash-Sharh 94:5",
        "English translation by Talal Itani (ClearQuran).",
        "",
        "Read it on MindfulVerse:",
        "https://mindfulverse.vercel.app/read/94?v=5",
      ].join("\n")
    );
  });

  it("goes without the surah's name when it is not known", () => {
    expect(verseShareText(ayah)).toContain("\n\nQur’an 94:5\n");
  });

  it("never changes the translation", () => {
    const dashed = { ...ayah, translation: "acceptable to all—if one fails" };
    expect(verseShareText(dashed)).toContain(
      "“acceptable to all—if one fails”"
    );
  });

  it("links straight to the verse", () => {
    expect(verseUrl({ ayah: 69, surah: 4 })).toBe(
      "https://mindfulverse.vercel.app/read/4?v=69"
    );
  });
});

describe(surahNameInTime, () => {
  const list = [{ name: "An-Nisa", number: 4 }];

  it("returns the name when the list is ready", async () => {
    await expect(surahNameInTime(4, Promise.resolve(list))).resolves.toBe(
      "An-Nisa"
    );
  });

  it("gives up when the list is slow or fails", async () => {
    const never = new Promise<typeof list>(() => {});
    await expect(surahNameInTime(4, never, 5)).resolves.toBeUndefined();
    await expect(
      surahNameInTime(4, Promise.reject(new Error("offline")))
    ).resolves.toBeUndefined();
  });
});
