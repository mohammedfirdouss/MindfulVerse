import { describe, it, expect } from "vitest";

import { formatTadabburBody, parseTadabburBody } from "./tadabburBody";

describe("tadabbur body", () => {
  it("round-trips all four parts", () => {
    const parts = {
      action: "c",
      connections: "d",
      lessons: "a",
      reflection: "b",
    };
    expect(parseTadabburBody(formatTadabburBody(parts))).toStrictEqual(parts);
  });

  it("matches what keep() wrote before this change", () => {
    expect(parseTadabburBody("Lessons: x\n\nAction: do y")).toStrictEqual({
      action: "do y",
      lessons: "x",
    });
    expect(
      formatTadabburBody({ action: "c", lessons: " a ", reflection: "b" })
    ).toBe("Lessons: a\n\nReflection: b\n\nAction: c");
  });

  it("keeps extra paragraphs with the field above", () => {
    expect(
      parseTadabburBody("Reflection: one\n\ntwo\n\nAction: go")
    ).toStrictEqual({
      action: "go",
      reflection: "one\n\ntwo",
    });
  });

  it("ignores a label that is not at the start of a paragraph", () => {
    expect(
      parseTadabburBody("Lessons: I read Action: in a book")
    ).toStrictEqual({
      lessons: "I read Action: in a book",
    });
  });

  it("returns null for free text", () => {
    expect(parseTadabburBody("Just a thought")).toBeNull();
    expect(parseTadabburBody("intro\n\nAction: x")).toBeNull();
  });

  it("formatTadabburBody skips blank parts", () => {
    expect(formatTadabburBody({ action: "x", lessons: "  " })).toBe(
      "Action: x"
    );
  });
});
