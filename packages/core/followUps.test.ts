import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FOLLOW_UP_MAX_MS,
  FOLLOW_UP_MIN_MS,
  FOLLOW_UP_SKIP_MS,
  answerFollowUp,
  dueFollowUp,
  loadFollowUpState,
  parseFollowUpBody,
  saveFollowUpState,
  skipFollowUp,
} from "./followUps";
import type { FollowUpState } from "./followUps";
import { addEntry } from "./journal";
import { formatTadabburBody } from "./tadabburBody";
import type { JournalEntry } from "./types";

vi.mock(import("./journal"), () => ({
  addEntry: vi.fn((input: unknown) => input) as never,
}));

const now = new Date(2026, 9, 30, 12);
const DAY = 86_400_000;
const empty = (): FollowUpState => ({ skipped: {}, lastActedDay: null });

function tadabbur(
  id: string,
  ageMs: number,
  body = formatTadabburBody({ action: "call mum" }),
  kind: NonNullable<JournalEntry["context"]>["kind"] = "tadabbur"
): JournalEntry {
  return {
    id,
    createdAt: now.getTime() - ageMs,
    prompt: "p",
    body,
    context: { kind, ref: "94:5" },
  };
}

function memoryStore(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  } as unknown as Storage;
}

describe(dueFollowUp, () => {
  it("is due at exactly 7 days, not before", () => {
    const due = dueFollowUp([tadabbur("a", 7 * DAY)], now, empty());
    expect(due?.action).toBe("call mum");
    expect(due?.verseKey).toBe("94:5");
    expect(
      dueFollowUp([tadabbur("a", 7 * DAY - 3_600_000)], now, empty())
    ).toBeNull();
    expect(FOLLOW_UP_MIN_MS).toBe(7 * DAY);
  });

  it("is due at exactly 30 days, not after", () => {
    expect(
      dueFollowUp([tadabbur("a", FOLLOW_UP_MAX_MS)], now, empty())
    ).not.toBeNull();
    expect(
      dueFollowUp([tadabbur("a", FOLLOW_UP_MAX_MS + 1)], now, empty())
    ).toBeNull();
  });

  it("is not due once answered, from any device", () => {
    const answer: JournalEntry = {
      id: "f",
      createdAt: now.getTime(),
      prompt: "x",
      body: "Yes",
      context: { kind: "followup", ref: "a" },
    };
    expect(
      dueFollowUp([tadabbur("a", 8 * DAY), answer], now, empty())
    ).toBeNull();
  });

  it("is not due without an action or for unparseable bodies", () => {
    const lessons = formatTadabburBody({ lessons: "patience" });
    expect(
      dueFollowUp([tadabbur("a", 8 * DAY, lessons)], now, empty())
    ).toBeNull();
    expect(
      dueFollowUp([tadabbur("b", 8 * DAY, "just words")], now, empty())
    ).toBeNull();
    expect(
      dueFollowUp(
        [tadabbur("c", 8 * DAY, formatTadabburBody({ action: "   " }))],
        now,
        empty()
      )
    ).toBeNull();
  });

  it("returns the oldest due first", () => {
    const list = [
      tadabbur("b", 10 * DAY),
      tadabbur("c", 20 * DAY),
      tadabbur("a", 8 * DAY),
    ];
    expect(dueFollowUp(list, now, empty())?.entry.id).toBe("c");
  });

  it("hides a skipped entry for 7 days", () => {
    const list = [tadabbur("old", 20 * DAY), tadabbur("new", 10 * DAY)];
    const hidden: FollowUpState = {
      skipped: { old: now.getTime() - 6 * DAY },
      lastActedDay: null,
    };
    expect(dueFollowUp(list, now, hidden)?.entry.id).toBe("new");
    const back: FollowUpState = {
      skipped: { old: now.getTime() - FOLLOW_UP_SKIP_MS },
      lastActedDay: null,
    };
    expect(dueFollowUp(list, now, back)?.entry.id).toBe("old");
  });

  it("allows one per local day", () => {
    const list = [tadabbur("a", 8 * DAY)];
    const today: FollowUpState = {
      skipped: {},
      lastActedDay: now.toDateString(),
    };
    expect(dueFollowUp(list, now, today)).toBeNull();
    const yesterday: FollowUpState = {
      skipped: {},
      lastActedDay: new Date(2026, 9, 29).toDateString(),
    };
    expect(dueFollowUp(list, now, yesterday)).not.toBeNull();
  });

  it("ignores non-tadabbur kinds", () => {
    expect(
      dueFollowUp(
        [tadabbur("a", 8 * DAY, "Action: call mum", "checkin")],
        now,
        empty()
      )
    ).toBeNull();
  });
});

describe("follow-up state storage", () => {
  it("returns empty state for corrupt, null or missing stores", () => {
    const bad = { getItem: () => "{bad" };
    expect(loadFollowUpState(bad)).toStrictEqual(empty());
    expect(loadFollowUpState(null)).toStrictEqual(empty());
    expect(loadFollowUpState(memoryStore())).toStrictEqual(empty());
  });

  it("round-trips and never throws", () => {
    const store = memoryStore();
    const state: FollowUpState = {
      skipped: { a: 5 },
      lastActedDay: "Fri Oct 30 2026",
    };
    saveFollowUpState(state, store);
    expect(loadFollowUpState(store)).toStrictEqual(state);
    expect(() =>
      saveFollowUpState(state, {
        setItem: () => {
          throw new Error("blocked");
        },
      })
    ).not.toThrow();
  });
});

describe("skipFollowUp / answerFollowUp", () => {
  beforeEach(() => {
    vi.mocked(addEntry).mockClear();
  });

  it("skip records time and day", () => {
    const next = skipFollowUp(empty(), "a", now);
    expect(next.skipped.a).toBe(now.getTime());
    expect(next.lastActedDay).toBe(now.toDateString());
  });

  it("writes the exact body and marks today", () => {
    const due = dueFollowUp([tadabbur("a", 8 * DAY)], now, empty());
    if (!due) {
      throw new Error("expected a due follow-up");
    }
    const next = answerFollowUp(due, "Partly", " note ", now, empty());
    expect(addEntry).toHaveBeenLastCalledWith({
      context: { kind: "followup", ref: "a" },
      prompt: "How did it go? (94:5)",
      body: "Partly\n\nnote",
    });
    expect(next.lastActedDay).toBe(now.toDateString());
    answerFollowUp(due, "Yes", "  ", now, empty());
    expect(addEntry).toHaveBeenLastCalledWith(
      expect.objectContaining({ body: "Yes" })
    );
  });

  it("parseFollowUpBody reverses both shapes", () => {
    expect(parseFollowUpBody("Partly\n\nnote")).toStrictEqual({
      answer: "Partly",
      note: "note",
    });
    expect(parseFollowUpBody("Yes")).toStrictEqual({ answer: "Yes", note: "" });
    expect(parseFollowUpBody("Maybe\n\nx")).toStrictEqual({
      answer: null,
      note: "Maybe\n\nx",
    });
  });
});
