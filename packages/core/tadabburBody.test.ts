import { describe, it, expect } from "vitest";

import {
  formatSessionBody,
  formatTadabburBody,
  parseTadabburBody,
  TADABBUR_LABELS,
} from "./tadabburBody";

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

describe("new labels", () => {
  it("round-trips all new parts", () => {
    const parts = {
      action: "e",
      feeling: "a",
      reminder: "b",
      research: "f",
      takeaway: "c",
    };
    expect(parseTadabburBody(formatTadabburBody(parts))).toStrictEqual(parts);
  });

  it("still parses an old body", () => {
    expect(
      parseTadabburBody(
        "Lessons: l\n\nReflection: r\n\nAction: a\n\nConnections: c"
      )
    ).toStrictEqual({
      action: "a",
      connections: "c",
      lessons: "l",
      reflection: "r",
    });
  });

  it("has no label that is a prefix of another", () => {
    const labels = Object.values(TADABBUR_LABELS).map((l) => `${l}: `);
    const clashes = labels.flatMap((a) =>
      labels.filter((b) => a !== b && b.startsWith(a))
    );
    expect(clashes).toStrictEqual([]);
  });
});

describe(formatSessionBody, () => {
  it("keeps the reflection unchanged when there is no action", () => {
    expect(formatSessionBody("  Reflection: odd\n\nfree text ", " ")).toBe(
      "Reflection: odd\n\nfree text"
    );
    expect(formatSessionBody("plain words", "")).toBe("plain words");
  });

  it("labels both parts when there is an action", () => {
    const body = formatSessionBody(" it stayed ", " call mum ");
    expect(body).toBe("Reflection: it stayed\n\nAction: call mum");
    expect(parseTadabburBody(body)).toStrictEqual({
      action: "call mum",
      reflection: "it stayed",
    });
  });
});
