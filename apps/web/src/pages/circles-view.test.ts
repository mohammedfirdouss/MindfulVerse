import { describe, expect, it } from "vitest";

import {
  checkCircleForm,
  circleShareMessage,
  circleShareUrl,
  circleSummary,
  passageOptionLabel,
  portionValue,
  whatsappUrl,
} from "./circles-view";

const counts = new Map([
  [18, 110],
  [108, 3],
]);
const verseCount = (s: number) => counts.get(s);

describe("circle share link", () => {
  it("builds the link from the origin", () => {
    expect(circleShareUrl("https://mindfulverse.vercel.app", "abc234")).toBe(
      "https://mindfulverse.vercel.app/circle/abc234"
    );
    expect(circleShareUrl("http://localhost:5173/", "abc234")).toBe(
      "http://localhost:5173/circle/abc234"
    );
  });

  it("mentions the focus verse only when set", () => {
    const url = "https://x.app/circle/abc234";
    expect(
      circleShareMessage(
        { name: "Friday friends", verse: null },
        "Al-Kahf",
        url
      )
    ).toBe(`Read Al-Kahf with “Friday friends” on MindfulVerse.\n${url}`);
    expect(
      circleShareMessage({ name: "Friday friends", verse: 10 }, "Al-Kahf", url)
    ).toContain("Read Al-Kahf, from verse 10, with");
  });

  it("encodes the WhatsApp message", () => {
    expect(whatsappUrl("a b\n&")).toBe("https://wa.me/?text=a%20b%0A%26");
  });

  it("summarises the surah and portion", () => {
    expect(circleSummary({ verse: null }, "Al-Kahf")).toBe("Al-Kahf");
    expect(circleSummary({ verse: 10 }, "Al-Kahf")).toBe("Al-Kahf · verse 10");
    expect(circleSummary({ verse: 7, verseEnd: 12 }, "Al-Kahf")).toBe(
      "Al-Kahf · verses 7 to 12"
    );
  });

  it("names a range in the share message", () => {
    expect(
      circleShareMessage({ name: "F", verse: 7, verseEnd: 12 }, "Al-Kahf", "u")
    ).toContain("Read Al-Kahf, verses 7 to 12, with");
  });
});

describe("circle form check", () => {
  it("accepts a name and surah for the whole surah", () => {
    expect(
      checkCircleForm(
        { name: "  Friday  friends ", portion: "", surah: "18" },
        verseCount
      )
    ).toStrictEqual({
      draft: { name: "Friday friends", surah: 18, verse: null, verseEnd: null },
      ok: true,
    });
  });

  it("needs a name and a surah", () => {
    expect(
      checkCircleForm({ name: "  ", portion: "", surah: "18" }, verseCount).ok
    ).toBeFalsy();
    expect(
      checkCircleForm({ name: "A", portion: "", surah: "" }, verseCount).ok
    ).toBeFalsy();
  });

  it("reads a focus verse or a range, inside the surah", () => {
    expect(
      checkCircleForm({ name: "A", portion: "110", surah: "18" }, verseCount)
    ).toStrictEqual({
      draft: { name: "A", surah: 18, verse: 110, verseEnd: null },
      ok: true,
    });
    expect(
      checkCircleForm({ name: "A", portion: "7-12", surah: "18" }, verseCount)
    ).toStrictEqual({
      draft: { name: "A", surah: 18, verse: 7, verseEnd: 12 },
      ok: true,
    });
    for (const portion of ["4", "1-4", "9-7", "2.5", "x"]) {
      expect(
        checkCircleForm({ name: "A", portion, surah: "108" }, verseCount).ok
      ).toBeFalsy();
    }
  });
});

describe("portion values", () => {
  it("round-trips a circle's portion", () => {
    expect(portionValue({ verse: null, verseEnd: null })).toBe("");
    expect(portionValue({ verse: 7, verseEnd: null })).toBe("7");
    expect(portionValue({ verse: 7, verseEnd: 12 })).toBe("7-12");
  });

  it("labels a passage", () => {
    expect(passageOptionLabel({ from: 7, theme: "The cave", to: 12 })).toBe(
      "Verses 7 to 12: The cave"
    );
    expect(passageOptionLabel({ from: 3, theme: "One", to: 3 })).toBe(
      "Verse 3: One"
    );
  });
});
