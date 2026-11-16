// Share a verse — the v0 distribution loop. Uses the Web Share API where
// available (mobile, straight into WhatsApp), falls back to clipboard.
import { track } from "@mindfulverse/core/analytics";
import { loadSurahs } from "@mindfulverse/core/data";
import { surahNameInTime, verseShareText } from "@mindfulverse/core/shareText";
import type { Ayah } from "@mindfulverse/core/types";

/** Returns "shared" | "copied" | "cancelled" | "failed" so the caller can
 *  confirm in the UI — "cancelled" (share sheet dismissed) confirms nothing. */
export async function shareVerse(
  ayah: Ayah,
  where: string
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const text = verseShareText(
    ayah,
    await surahNameInTime(ayah.surah, loadSurahs())
  );
  track({ type: "share_verse", verseKey: ayah.verseKey, where });
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (error) {
    // user cancelling the share sheet is not a failure worth surfacing
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
