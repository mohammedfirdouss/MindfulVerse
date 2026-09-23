import { useEffect, useRef, useState } from "react";
import { shareVerse } from "./share";
import type { Ayah } from "./types";

/** One share button's confirmation: "Shared ✓" / "Copied ✓" for two seconds,
 *  nothing when the share sheet is dismissed or fails. */
export function useShareFeedback(where: string) {
  const [label, setLabel] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share(a: Ayah) {
    const result = await shareVerse(a, where);
    if (result === "cancelled" || result === "failed") return;
    window.clearTimeout(timer.current);
    setLabel(result === "copied" ? "Copied ✓" : "Shared ✓");
    timer.current = window.setTimeout(() => setLabel(null), 2000);
  }

  return { label, share };
}
