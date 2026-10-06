import { useEffect, useRef, useState } from "react";
import { Share } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import type { Ayah } from "@mindfulverse/core/types";
import { verseShareText } from "./commentary";

/** Web's shareVerse (lib/share.ts) over the native share sheet. Same text and
 *  the same `share_verse` event; there is no clipboard fallback because the
 *  share sheet always exists on native. */
export async function shareVerse(ayah: Ayah, where: string): Promise<"shared" | "cancelled" | "failed"> {
  track({ type: "share_verse", verseKey: ayah.verseKey, where });
  try {
    const r = await Share.share({ message: verseShareText(ayah) });
    return r.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    return "failed";
  }
}

/** One share button's "Shared ✓" confirmation for two seconds (web's
 *  useShareFeedback). Nothing when the sheet is dismissed or fails. */
export function useShareFeedback(where: string) {
  const [label, setLabel] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share(a: Ayah) {
    const result = await shareVerse(a, where);
    if (result !== "shared") return;
    clearTimeout(timer.current);
    setLabel("Shared ✓");
    timer.current = setTimeout(() => setLabel(null), 2000);
  }

  return { label, share };
}
