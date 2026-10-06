// Verse sharing for every screen (Check-in, Reader, Tadabbur): web's
// lib/share.ts on the native share sheet. Same text, the same `share_verse`
// event (fired on the tap, before the sheet opens, with the screen's `where`),
// and one feedback rule:
//   - "Shared ✓" only when the OS says so: iOS reports sharedAction after a
//     share and dismissedAction when the sheet is closed. Android always
//     reports sharedAction, even when the chooser is backed out of, so it
//     never claims success; it just shows no error.
//   - "Couldn’t share" when Share.share throws (e.g. a message too large for
//     the share intent).
// There is no clipboard fallback (no expo-clipboard), so "copied" never shows.
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Share } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import type { Ayah } from "@mindfulverse/core/types";

/** Web's lib/share.ts verseText, verbatim, so a verse shared from either app
 *  reads the same in WhatsApp. */
export function verseShareText(a: Pick<Ayah, "arabic" | "translation" | "surah" | "ayah">): string {
  return `${a.arabic}\n\n“${a.translation}”\n\n— Qur’an ${a.surah}:${a.ayah}\n\nvia MindfulVerse`;
}

export type ShareOutcome = "shared" | "unconfirmed" | "failed";

/** What a resolved Share.share() result lets us claim. */
export function shareOutcome(action: string, os: string): ShareOutcome {
  return os === "ios" && action === Share.sharedAction ? "shared" : "unconfirmed";
}

export const SHARED_LABEL = "Shared ✓";
export const SHARE_FAILED_LABEL = "Couldn’t share";

/** Opens the share sheet for one verse. Never throws. */
export async function shareVerse(ayah: Ayah, where: string): Promise<ShareOutcome> {
  track({ type: "share_verse", verseKey: ayah.verseKey, where });
  try {
    const r = await Share.share({ message: verseShareText(ayah) });
    return shareOutcome(r.action, Platform.OS);
  } catch {
    return "failed";
  }
}

/** One share action's state: `label` is "Shared ✓" or "Couldn’t share" for a
 *  few seconds after a tap (announced to screen readers), otherwise null, so
 *  buttons render `label ?? "Share"`. */
export function useShareVerse(where: string) {
  const [label, setLabel] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
      clearTimeout(timer.current);
    },
    [],
  );

  const share = useCallback(
    async (a: Ayah) => {
      const outcome = await shareVerse(a, where);
      if (!mounted.current) return;
      clearTimeout(timer.current);
      const next = outcome === "shared" ? SHARED_LABEL : outcome === "failed" ? SHARE_FAILED_LABEL : null;
      setLabel(next);
      if (!next) return;
      AccessibilityInfo.announceForAccessibility(next);
      timer.current = setTimeout(() => mounted.current && setLabel(null), outcome === "failed" ? 3000 : 2000);
    },
    [where],
  );

  return { label, share };
}
