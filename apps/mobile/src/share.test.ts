// The share text (web's lib/share.ts verseText) and the feedback rule.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rn = vi.hoisted(() => ({
  os: "ios",
  share: (async () => ({ action: "sharedAction" })) as (c: unknown) => Promise<{ action: string }>,
  tracked: [] as unknown[],
}));
vi.mock("react-native", () => ({
  Share: {
    sharedAction: "sharedAction",
    dismissedAction: "dismissedAction",
    share: (c: unknown) => rn.share(c),
  },
  Platform: {
    get OS() {
      return rn.os;
    },
  },
  AccessibilityInfo: { announceForAccessibility: () => {} },
}));
vi.mock("@mindfulverse/core/analytics", () => ({ track: (e: unknown) => rn.tracked.push(e) }));

import { shareOutcome, shareVerse, verseShareText } from "./share";

const ayah = {
  arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
  translation: "So with hardship comes ease.",
  surah: 94,
  ayah: 5,
  verseKey: "94:5",
} as Parameters<typeof shareVerse>[0];

beforeEach(() => {
  rn.os = "ios";
  rn.tracked.length = 0;
});

describe("verseShareText", () => {
  it("matches web's shared-verse format", () => {
    expect(verseShareText(ayah)).toBe(
      "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا\n\n“So with hardship comes ease.”\n\n— Qur’an 94:5\n\nvia MindfulVerse",
    );
  });
});

describe("shareOutcome", () => {
  it("confirms only an iOS sharedAction", () => {
    expect(shareOutcome("sharedAction", "ios")).toBe("shared");
    expect(shareOutcome("dismissedAction", "ios")).toBe("unconfirmed");
    // Android reports sharedAction even when the chooser is backed out of.
    expect(shareOutcome("sharedAction", "android")).toBe("unconfirmed");
  });
});

describe("shareVerse", () => {
  it("tracks share_verse with the screen and sends web's text", async () => {
    let sent: unknown;
    rn.share = async (c) => ((sent = c), { action: "sharedAction" });
    await expect(shareVerse(ayah, "tadabbur")).resolves.toBe("shared");
    expect(rn.tracked).toEqual([{ type: "share_verse", verseKey: "94:5", where: "tadabbur" }]);
    expect(sent).toEqual({ message: verseShareText(ayah) });
  });
  it("reports a thrown share as failed, without throwing", async () => {
    rn.os = "android";
    rn.share = async () => {
      throw new Error("TransactionTooLarge");
    };
    await expect(shareVerse(ayah, "checkin")).resolves.toBe("failed");
  });
});
