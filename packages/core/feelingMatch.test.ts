import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FEELING_WORDS,
  MAX_FEELING_MATCHES,
  feelingTokens,
  matchFeelings,
} from "./feelingMatch";
import type { EmotionEntry } from "./types";

const DATA = join(import.meta.dirname, "../../apps/web/public/data");
const EMOTIONS = JSON.parse(
  readFileSync(join(DATA, "emotions.json"), "utf-8")
) as EmotionEntry[];
const IDS = EMOTIONS.map((e) => e.id);

const ids = (text: string) => matchFeelings(text, IDS).map((m) => m.id);

describe("the word list", () => {
  it("only names emotion ids that exist in emotions.json", () => {
    for (const key of Object.keys(FEELING_WORDS)) {
      expect(IDS).toContain(key);
    }
  });

  it("covers every chip", () => {
    expect(new Set(Object.keys(FEELING_WORDS))).toStrictEqual(new Set(IDS));
  });

  it("never files the same words under two feelings", () => {
    const seen = new Map<string, string>();
    for (const [id, words] of Object.entries(FEELING_WORDS)) {
      for (const word of words) {
        const key = feelingTokens(word).join(" ");
        expect(seen.get(key) ?? id).toBe(id);
        seen.set(key, id);
      }
    }
  });
});

describe(feelingTokens, () => {
  it("lowercases and strips punctuation and apostrophes", () => {
    expect(feelingTokens("I CAN'T sleep, honestly!!")).toStrictEqual([
      "i",
      "cant",
      "sleep",
      "honestly",
    ]);
    expect(feelingTokens("isn’t  it")).toStrictEqual(["isnt", "it"]);
  });
});

describe(matchFeelings, () => {
  it("matches everyday words", () => {
    expect(ids("really stressed about exams")).toStrictEqual(["anxious"]);
    expect(ids("I'm so thankful today")).toStrictEqual(["grateful"]);
    expect(ids("furious with my brother")).toStrictEqual(["angry"]);
    expect(ids("feeling guilty")).toStrictEqual(["regretful"]);
    expect(ids("scared")).toStrictEqual(["afraid"]);
    expect(ids("exhausted")).toStrictEqual(["weary"]);
  });

  it("returns the words that matched", () => {
    expect(matchFeelings("Really STRESSED!", IDS)).toStrictEqual([
      { id: "anxious", word: "stressed" },
    ]);
  });

  it("matches phrases", () => {
    expect(ids("I miss my dad")).toStrictEqual(["grieving"]);
    expect(ids("nobody understands me")).toStrictEqual(["lonely"]);
    expect(ids("totally burnt out")).toStrictEqual(["weary"]);
    expect(ids("I can't sleep")).toStrictEqual(["restless"]);
    expect(ids("confused about what to study")).toStrictEqual([
      "seeking-guidance",
    ]);
  });

  it("lets a phrase claim its words before a shorter entry", () => {
    // "lost" alone points to guidance; "lost my mum" is grief.
    expect(ids("I feel lost")).toStrictEqual(["seeking-guidance"]);
    expect(ids("I lost my mum last year")).toStrictEqual(["grieving"]);
  });

  it("stems -s, -ed and -ing", () => {
    expect(ids("worried")).toStrictEqual(["anxious"]);
    expect(ids("worrying a lot")).toStrictEqual(["anxious"]);
    expect(ids("so many worries")).toStrictEqual(["anxious"]);
    expect(ids("hoping")).toStrictEqual(["hopeful"]);
    expect(ids("my regrets")).toStrictEqual(["regretful"]);
    expect(ids("missing my dad")).toStrictEqual(["grieving"]);
  });

  it("skips a match that is negated", () => {
    expect(ids("not anxious")).toStrictEqual([]);
    expect(ids("I'm not feeling anxious")).toStrictEqual([]);
    expect(ids("I don't feel guilty")).toStrictEqual([]);
    expect(ids("there is no hope")).toStrictEqual([]);
    expect(ids("never lonely")).toStrictEqual([]);
    expect(ids("it isn’t stress")).toStrictEqual([]);
  });

  it("still counts a later, unnegated feeling", () => {
    expect(ids("not angry, just tired")).toStrictEqual(["weary"]);
    expect(ids("I'm not sure, I feel anxious")).toStrictEqual(["anxious"]);
  });

  it("ranks a phrase above a word and more hits higher", () => {
    // One word each: the earlier mention leads.
    expect(ids("tired and anxious")).toStrictEqual(["weary", "anxious"]);
    // A phrase outranks a single word, wherever it sits.
    expect(ids("tired and nobody understands")).toStrictEqual([
      "lonely",
      "weary",
    ]);
    // Two hits outrank one.
    expect(ids("tired, worried and stressed")).toStrictEqual([
      "anxious",
      "weary",
    ]);
  });

  it("returns at most two", () => {
    const many = matchFeelings("scared, angry, tired, guilty and lonely", IDS);
    expect(many).toHaveLength(MAX_FEELING_MATCHES);
    expect(many.map((m) => m.id)).toStrictEqual(["afraid", "angry"]);
  });

  it("copes with emoji, accents and long text", () => {
    expect(ids("STRESSED \u{1F629}\u{1F629} caf\u00E9")).toStrictEqual([
      "anxious",
    ]);
    expect(ids(`${"la ".repeat(2000)}lonely`)).toStrictEqual(["lonely"]);
  });

  it("is deterministic", () => {
    const text = "angry and scared";
    expect(matchFeelings(text, IDS)).toStrictEqual(matchFeelings(text, IDS));
  });

  it("returns nothing when no word fits", () => {
    expect(ids("xyzzy")).toStrictEqual([]);
    expect(ids("")).toStrictEqual([]);
    expect(ids("   ")).toStrictEqual([]);
    expect(ids("the weather")).toStrictEqual([]);
  });

  it("only suggests ids it was given", () => {
    expect(matchFeelings("stressed and tired", ["weary"])).toStrictEqual([
      { id: "weary", word: "tired" },
    ]);
  });
});
