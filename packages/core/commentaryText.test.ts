import { describe, expect, it } from "vitest";

import { commentaryParagraphs } from "./commentaryText";

describe(commentaryParagraphs, () => {
  it("puts each verse of the opening list on its own line", () => {
    const text =
      'Say: "Shall We tell you the greatest losers? (103)"Those whose efforts have been wasted. (104)"They are those who deny. (105)\n\nThe Greatest Losers\n\nAl-Bukhari recorded this.';
    expect(commentaryParagraphs(text)).toStrictEqual([
      'Say: "Shall We tell you the greatest losers? (103)',
      '"Those whose efforts have been wasted. (104)',
      '"They are those who deny. (105)',
      "The Greatest Losers",
      "Al-Bukhari recorded this.",
    ]);
  });

  it("splits before a bracketed opening word", () => {
    expect(
      commentaryParagraphs("He was (59)(This is) the truth (60)\n\nBody.")
    ).toStrictEqual(["He was (59)", "(This is) the truth (60)", "Body."]);
  });

  it("puts each numbered verse on its own line, wherever the list sits", () => {
    const text =
      "In the Name of Allah.\n\n(1. By Al-'Asr.)(2. Verily, man is in loss.)(3. Except those who believe.)\n\nBody (see above).";
    expect(commentaryParagraphs(text)).toStrictEqual([
      "In the Name of Allah.",
      "(1. By Al-'Asr.)",
      "(2. Verily, man is in loss.)",
      "(3. Except those who believe.)",
      "Body (see above).",
    ]);
  });

  it("leaves numbered lists in the body alone", () => {
    const text = "A verse (1)\n\nThey are: (1)a man, (2)an unjust ruler.";
    expect(commentaryParagraphs(text)).toStrictEqual([
      "A verse (1)",
      "They are: (1)a man, (2)an unjust ruler.",
    ]);
  });

  it("adds the missing space between two sentences", () => {
    expect(
      commentaryParagraphs(
        'A verse (1)\n\nHe said.However, he did not. "It is so."Allah tells us.'
      )
    ).toStrictEqual([
      "A verse (1)",
      'He said. However, he did not. "It is so." Allah tells us.',
    ]);
  });

  it("adds the missing space between two brackets that touch", () => {
    expect(
      commentaryParagraphs("V (1)\n\n(He opens his breast.)(6:125) So it is.")
    ).toStrictEqual(["V (1)", "(He opens his breast.) (6:125) So it is."]);
  });

  it("does not touch an apostrophe that may open a name", () => {
    expect(
      commentaryParagraphs("V (1)\n\nFrom Ad-Dahhak.'Ali said.")
    ).toStrictEqual(["V (1)", "From Ad-Dahhak.'Ali said."]);
  });

  it("keeps every word and character of the source", () => {
    const text = 'One. (1)"Two. (2)\n\nThree said.Four.';
    const strip = (s: string) => s.replaceAll(/\s/gu, "");
    expect(strip(commentaryParagraphs(text).join(""))).toBe(strip(text));
  });

  it("returns nothing for empty or missing text", () => {
    expect(commentaryParagraphs(null)).toStrictEqual([]);
    expect(commentaryParagraphs("")).toStrictEqual([]);
  });
});
