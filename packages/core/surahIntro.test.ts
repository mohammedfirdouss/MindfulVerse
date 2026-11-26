import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { INTRO_CREDIT, introBlocks, introSections } from "./surahIntro";

const INFO = join(import.meta.dirname, "../../apps/web/public/data/info");
const info = (surah: number): string =>
  (
    JSON.parse(readFileSync(join(INFO, `${surah}.json`), "utf-8")) as {
      text: string;
    }
  ).text;
const sourceParagraphs = (text: string): string[] =>
  text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
const WHY = "Why it was revealed";
const WHEN = "When it was revealed";

describe(introSections, () => {
  it("leads Al-Baqarah with why it was revealed, then the rest in order", () => {
    const sections = introSections(info(2));
    expect(sections[0].kind).toBe("why");
    expect(sections[0].heading).toBe(WHY);
    expect(sections[0].paragraphs[0]).toMatch(
      /^In order to understand the meaning/u
    );
    expect(sections.slice(1).map((s) => s.heading)).toStrictEqual([
      "Name",
      "Why the name Al-Baqarah?",
      "Sequence",
      "Theme: Guidance",
      "Topics and their Interconnection",
    ]);
    expect(sections.filter((s) => s.kind === "why")).toHaveLength(1);
  });

  it("gives Al-Balad (90) when but never why", () => {
    const sections = introSections(info(90));
    expect(sections.map((s) => s.heading)).toStrictEqual([
      "Name",
      WHEN,
      "Theme and Subject Matter",
    ]);
    expect(sections[1].kind).toBe("when");
    expect(sections.some((s) => s.kind === "why")).toBeFalsy();
    expect(JSON.stringify(sections)).not.toContain(WHY);
  });

  it("maps Occasion of Revelation to why (Al-Ma'idah)", () => {
    const sections = introSections(info(5));
    expect(sections[0]).toMatchObject({ heading: WHY, kind: "why" });
    expect(sections.map((s) => s.heading)).not.toContain(
      "Occasion of Revelation"
    );
  });

  it("maps the other why and when spellings", () => {
    expect(introSections(info(3))[0].kind).toBe("why"); // Background
    expect(
      introSections(info(10)).find((s) => s.kind === "when")?.heading
    ).toBe(WHEN); // Time of Revelation
    expect(introSections(info(8)).find((s) => s.kind === "when")?.heading).toBe(
      WHEN
    ); // The Period of Revelation
  });

  it("leads Yusuf (12) with one why section holding both backgrounds", () => {
    const sections = introSections(info(12));
    expect(sections[0]).toMatchObject({ heading: WHY, kind: "why" });
    expect(sections.filter((s) => s.heading === WHY)).toHaveLength(1);
    expect(sections[0].paragraphs).toContain(
      "Historical and Geographical Background"
    );
    expect(sections.map((s) => s.heading)).toStrictEqual([
      WHY,
      "Topics of Discussion",
    ]);
  });

  it("leads Al-Ghafir (40) with why from Background of Revelation", () => {
    const sections = introSections(info(40));
    expect(sections[0]).toMatchObject({ heading: WHY, kind: "why" });
    expect(sections.map((s) => s.heading)).toStrictEqual([
      WHY,
      "Name",
      WHEN,
      "Theme and Topics",
    ]);
  });

  it("gives Al-Alaq (96) no why for a partial occasion heading", () => {
    const sections = introSections(info(96));
    expect(sections.some((s) => s.kind === "why")).toBeFalsy();
    expect(sections.map((s) => s.heading)).toContain(
      "Occasion of Revelation of verses 6-19"
    );
  });

  it("keeps a why section's own sub-sections with it", () => {
    // Al-Imran: "Background" is followed by a lead-in line and its list.
    const imran = introSections(info(3))[0];
    expect(imran.paragraphs[0]).toBe(
      "The following is the background of the Surah:"
    );
    expect(imran.paragraphs.length).toBeGreaterThan(1);
    // At-Tawbah: the history runs through its own subheadings.
    const tawbah = introSections(info(9));
    expect(tawbah[0].paragraphs).toContain("Campaign to Tabuk");
    expect(tawbah.map((s) => s.heading)).toContain(
      "Subject: Problems of Peace and War"
    );
  });

  it("matches headings case-insensitively but exactly", () => {
    const text =
      "Backgrounds\n\nNo.\n\n  historical BACKGROUND  \n\nIt was so.";
    const sections = introSections(text);
    expect(sections[0]).toStrictEqual({
      heading: WHY,
      kind: "why",
      paragraphs: ["It was so."],
    });
    expect(sections[1]).toStrictEqual({
      heading: "Backgrounds",
      kind: "other",
      paragraphs: ["No."],
    });
  });

  it("returns one section for text without headings", () => {
    const text = "First paragraph here.\n\nSecond paragraph here.";
    expect(introSections(text)).toStrictEqual([
      {
        heading: null,
        kind: "other",
        paragraphs: ["First paragraph here.", "Second paragraph here."],
      },
    ]);
  });

  it("keeps text before the first heading as an untitled section", () => {
    const sections = introSections(info(113));
    expect(sections[0].heading).toBeNull();
    expect(sections[0].paragraphs.length).toBeGreaterThan(0);
  });

  it("returns nothing for empty text", () => {
    expect(introSections("")).toStrictEqual([]);
  });

  it("never changes or drops a paragraph, in every surah", () => {
    for (let surah = 1; surah <= 114; surah += 1) {
      const text = info(surah);
      const source = sourceParagraphs(text);
      const out = introSections(text).flatMap((s) => s.paragraphs);
      for (const p of out) {
        expect(source).toContain(p);
      }
      const headings = introSections(text).filter((s) => s.heading !== null);
      expect(out.length + headings.length).toBe(source.length);
      const emptyWhy = introSections(text).filter(
        (s) => s.kind === "why" && s.paragraphs.length === 0
      );
      expect(emptyWhy).toStrictEqual([]);
    }
  });
});

describe(introBlocks, () => {
  it("flattens sections into headings and paragraphs", () => {
    expect(
      introBlocks("Name\n\nIt is named.\n\nBackground\n\nWhy the name?\n\nSo.")
    ).toStrictEqual([
      { kind: "heading", text: WHY },
      { kind: "heading", text: "Why the name?" },
      { kind: "paragraph", text: "So." },
      { kind: "heading", text: "Name" },
      { kind: "paragraph", text: "It is named." },
    ]);
  });
});

describe("the introduction credit", () => {
  it("credits Maududi's Tafhim al-Qur'an", () => {
    expect(INTRO_CREDIT).toBe(
      "Introduction from Tafhim al-Qur'an (The Meaning of the Qur'an) by Sayyid Abul A'la Maududi."
    );
  });
});
