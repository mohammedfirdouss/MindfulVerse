import { describe, expect, it } from "vitest";
import { deeperLabel, greeting, readDesc, streakLine, tadabburTarget } from "./homeModel";

describe("greeting", () => {
  it("follows the hour like web", () => {
    expect(greeting(0)).toBe("Peace be upon you tonight");
    expect(greeting(4)).toBe("Peace be upon you tonight");
    expect(greeting(5)).toBe("Peace be upon you this morning");
    expect(greeting(11)).toBe("Peace be upon you this morning");
    expect(greeting(12)).toBe("Peace be upon you today");
    expect(greeting(17)).toBe("Peace be upon you today");
    expect(greeting(18)).toBe("Peace be upon you this evening");
    expect(greeting(23)).toBe("Peace be upon you this evening");
  });
});

describe("streakLine", () => {
  it("appears from day 2", () => {
    expect(streakLine(0)).toBeNull();
    expect(streakLine(1)).toBeNull();
    expect(streakLine(2)).toBe("Day 2 of returning to the Qur’an");
  });
});

describe("tadabbur entry", () => {
  it("continues the latest surah, else begins at Al-Fatihah", () => {
    expect(tadabburTarget({ surah: 18, ayah: 10 })).toEqual({ surah: 18, ayah: 10 });
    expect(tadabburTarget(null)).toEqual({ surah: 1, ayah: 1 });
  });

  it("labels the go-deeper button with the surah name when known", () => {
    const names = new Map([[18, "Al-Kahf"]]);
    expect(deeperLabel({ surah: 18, ayah: 10 }, names)).toBe("Go deeper — continue Al-Kahf");
    expect(deeperLabel({ surah: 2, ayah: 1 }, names)).toBe("Go deeper — continue Surah 2");
    expect(deeperLabel(null, names)).toBe("Go deeper — begin tadabbur");
  });
});

describe("readDesc", () => {
  it("offers to continue the last read verse", () => {
    expect(readDesc({ surah: 2, ayah: 255 })).toBe(
      "Continue where you stopped — Surah 2, verse 255",
    );
    expect(readDesc(null)).toBe("The Qur’an, with translation and commentary.");
  });
});
