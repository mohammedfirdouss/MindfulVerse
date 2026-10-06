// Web's lib/share.ts + useShareFeedback on RN Share: the system share sheet
// with web's text, the same `share_verse` event, and a two-second
// "Shared ✓" confirmation (nothing when the sheet is dismissed or fails).
// There is no clipboard fallback: RN's Share always has a sheet.
import { track } from "@mindfulverse/core/analytics";
import type { Ayah } from "@mindfulverse/core/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Share } from "react-native";
import { verseShareText } from "./logic";

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
      track({ type: "share_verse", verseKey: a.verseKey, where });
      try {
        const res = await Share.share({ message: verseShareText(a) });
        // Android reports sharedAction even when the chooser is backed out of.
        if (res.action !== Share.sharedAction || !mounted.current) return;
      } catch {
        return;
      }
      clearTimeout(timer.current);
      setLabel("Shared ✓");
      timer.current = setTimeout(() => mounted.current && setLabel(null), 2000);
    },
    [where],
  );

  return { label, share };
}
