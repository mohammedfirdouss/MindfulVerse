import { describe, expect, it } from "vitest";

import { dueFollowUp } from "./followUps";
import type { FollowUpState } from "./followUps";
import {
  EMPTY_REFLECTION,
  FEELINGS,
  firstAnsweredStep,
  MAX_FEELINGS,
  PROMPT_INTRO,
  PROMPTS,
  hasReflection,
  migrateDraft,
  reflectionBody,
  stepAnswered,
  toggleFeeling,
} from "./reflectionPrompts";
import { parseTadabburBody } from "./tadabburBody";
import type { JournalEntry } from "./types";

describe("prompt copy", () => {
  it("uses the exact feelings and limit", () => {
    expect(FEELINGS).toStrictEqual([
      "Peaceful",
      "Hopeful",
      "Grateful",
      "Moved",
      "Reassured",
      "Humbled",
      "Convicted",
      "Uneasy",
      "Afraid",
      "Confused",
      "Curious",
      "Longing",
    ]);
    expect(MAX_FEELINGS).toBe(3);
  });

  it("uses the exact prompt text", () => {
    expect(PROMPT_INTRO).toBe(
      "There are no right answers. Be honest; only you see this."
    );
    expect(PROMPTS.feeling).toBe("How did this verse make you feel?");
    expect(PROMPTS.feelingPlaceholder).toBe("Say more, if you like…");
    expect(PROMPTS.reminder).toBe(
      "What did it remind you of in your own life?"
    );
    expect(PROMPTS.takeaway).toBe("What's your takeaway?");
    expect(PROMPTS.actionPlaceholder).toBe("One thing you'll do (optional)");
    expect(PROMPTS.research).toBe("Anything you want to look into further?");
  });
});

describe(hasReflection, () => {
  it("is false for an empty or whitespace draft", () => {
    expect(hasReflection(EMPTY_REFLECTION)).toBeFalsy();
    expect(
      hasReflection({ ...EMPTY_REFLECTION, takeaway: "  \n" })
    ).toBeFalsy();
  });

  it("is true for feelings only", () => {
    expect(
      hasReflection({ ...EMPTY_REFLECTION, feelings: ["Moved"] })
    ).toBeTruthy();
  });

  it.each(["feelingNote", "reminder", "takeaway", "action", "research"])(
    "is true for text in %s",
    (field) => {
      expect(hasReflection({ ...EMPTY_REFLECTION, [field]: "x" })).toBeTruthy();
    }
  );
});

describe(migrateDraft, () => {
  it("maps an old draft", () => {
    expect(
      migrateDraft({ action: "call mum", lessons: "be patient", stirs: "home" })
    ).toStrictEqual({
      ...EMPTY_REFLECTION,
      action: "call mum",
      reminder: "home",
      takeaway: "be patient",
    });
  });

  it("keeps a new-shape draft and drops unknown or extra feelings", () => {
    const draft = {
      action: "a",
      feelingNote: "n",
      feelings: ["Moved", "Nope", "Hopeful", "Humbled", "Afraid"],
      reminder: "r",
      research: "s",
      takeaway: "t",
    };
    expect(migrateDraft(draft)).toStrictEqual({
      ...draft,
      feelings: ["Moved", "Hopeful", "Humbled"],
    });
  });

  it("returns an empty draft for junk", () => {
    for (const junk of [null, undefined, 4, "x", [], { feelings: "Moved" }]) {
      expect(migrateDraft(junk)).toStrictEqual(EMPTY_REFLECTION);
    }
  });

  it("never shares the feelings array with the empty draft", () => {
    migrateDraft(null).feelings.push("Moved");
    expect(EMPTY_REFLECTION.feelings).toStrictEqual([]);
  });
});

describe(reflectionBody, () => {
  const full = {
    action: "call mum",
    feelingNote: "it landed",
    feelings: ["Hopeful", "Moved"],
    reminder: "my grandmother",
    research: "the context",
    takeaway: "slow down",
  };

  it("writes labelled paragraphs in order", () => {
    expect(reflectionBody(full)).toBe(
      [
        "Feeling: Hopeful, Moved. it landed",
        "Reminded me of: my grandmother",
        "Takeaway: slow down",
        "Action: call mum",
        "To look into: the context",
      ].join("\n\n")
    );
  });

  it("round-trips through parseTadabburBody", () => {
    expect(parseTadabburBody(reflectionBody(full))).toStrictEqual({
      action: "call mum",
      feeling: "Hopeful, Moved. it landed",
      reminder: "my grandmother",
      research: "the context",
      takeaway: "slow down",
    });
  });

  it("handles feelings without a note and a note without feelings", () => {
    expect(reflectionBody({ ...EMPTY_REFLECTION, feelings: ["Moved"] })).toBe(
      "Feeling: Moved."
    );
    expect(
      reflectionBody({ ...EMPTY_REFLECTION, feelingNote: " quiet " })
    ).toBe("Feeling: quiet");
  });

  it("caps feelings and ignores unknown words", () => {
    expect(
      reflectionBody({
        ...EMPTY_REFLECTION,
        feelings: ["Peaceful", "Bogus", "Hopeful", "Grateful", "Moved"],
      })
    ).toBe("Feeling: Peaceful, Hopeful, Grateful.");
  });

  it("is empty for an empty draft", () => {
    expect(reflectionBody(EMPTY_REFLECTION)).toBe("");
  });

  it("lets the follow-up find the action", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const entry: JournalEntry = {
      body: reflectionBody(full),
      context: { kind: "tadabbur", ref: "1:1" },
      createdAt: now.getTime() - 8 * 86_400_000,
      id: "e1",
    } as JournalEntry;
    const state: FollowUpState = { lastActedDay: null, skipped: {} };
    expect(dueFollowUp([entry], now, state)?.action).toBe("call mum");
  });
});

const EMPTY = EMPTY_REFLECTION;

describe(stepAnswered, () => {
  it("counts a feeling or note on the first, either field on the third", () => {
    expect(stepAnswered(EMPTY, 0)).toBeFalsy();
    expect(stepAnswered({ ...EMPTY, feelings: ["Moved"] }, 0)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, feelingNote: "x" }, 0)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, reminder: " " }, 1)).toBeFalsy();
    expect(stepAnswered({ ...EMPTY, reminder: "mum" }, 1)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, action: "call" }, 2)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, takeaway: "x" }, 2)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, research: "x" }, 3)).toBeTruthy();
    expect(stepAnswered({ ...EMPTY, takeaway: "x" }, 3)).toBeFalsy();
  });
});

describe(firstAnsweredStep, () => {
  it("opens an empty draft on the first question", () => {
    expect(firstAnsweredStep(EMPTY)).toBe(0);
  });

  it("opens an old migrated draft on its reminder", () => {
    const old = migrateDraft({ action: "c", lessons: "a", stirs: "b" });
    expect(firstAnsweredStep(old)).toBe(1);
  });

  it("opens on the earliest answered question", () => {
    expect(firstAnsweredStep({ ...EMPTY, feelings: ["Moved"] })).toBe(0);
    expect(firstAnsweredStep({ ...EMPTY, action: "call" })).toBe(2);
    expect(firstAnsweredStep({ ...EMPTY, research: "x" })).toBe(3);
  });
});

describe(toggleFeeling, () => {
  it("adds in display order, removes, and stops at three", () => {
    expect(toggleFeeling(["Moved"], "Peaceful")).toStrictEqual([
      "Peaceful",
      "Moved",
    ]);
    expect(toggleFeeling(["Peaceful", "Moved"], "Peaceful")).toStrictEqual([
      "Moved",
    ]);
    const three = ["Peaceful", "Hopeful", "Grateful"];
    expect(toggleFeeling(three, "Afraid")).toStrictEqual(three);
    expect(toggleFeeling(three, "Hopeful")).toStrictEqual([
      "Peaceful",
      "Grateful",
    ]);
  });
});
