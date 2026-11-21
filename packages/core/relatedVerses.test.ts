import { describe, expect, it } from "vitest";

import {
  relatedTopicLabel,
  relatedTopics,
  verseReference,
} from "./relatedVerses";

const topics = [
  { name: "World", verses: ["2:85", "2:86", "18:103", "94:5"] },
  { name: "Hardship", verses: ["7:94", "94:5", "94:6"] },
  { name: "Ease", verses: ["94:5", "94:6", "65:7"] },
  { name: "Alone", verses: ["94:5"] },
  { name: "Time", verses: ["103:1", "76:1"] },
];

describe(relatedTopics, () => {
  it("lists the verse's topics, narrowest first, without the verse", () => {
    expect(relatedTopics(topics, "94:5", 3)).toStrictEqual([
      { name: "Ease", verses: ["94:6", "65:7"] },
      { name: "Hardship", verses: ["7:94", "94:6"] },
      { name: "World", verses: ["2:85", "2:86", "18:103"] },
    ]);
  });

  it("keeps at most two topics unless asked otherwise", () => {
    expect(relatedTopics(topics, "94:5")).toHaveLength(2);
    expect(relatedTopics(topics, "94:5", 1)).toHaveLength(1);
  });

  it("returns nothing for a verse under no topic", () => {
    expect(relatedTopics(topics, "1:1")).toStrictEqual([]);
  });
});

describe("labels", () => {
  it("counts the other verses", () => {
    expect(relatedTopicLabel({ name: "Hardship", verses: ["7:94"] })).toBe(
      "Hardship, in 1 other verse"
    );
    expect(
      relatedTopicLabel({ name: "Hardship", verses: ["7:94", "94:6"] })
    ).toBe("Hardship, in 2 other verses");
  });

  it("names the surah when it is known", () => {
    expect(verseReference("7:94", new Map([[7, "Al-A'raf"]]))).toBe(
      "Al-A'raf 7:94"
    );
    expect(verseReference("7:94", null)).toBe("7:94");
  });
});
