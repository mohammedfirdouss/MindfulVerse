// Share a verse — the v0 distribution loop. Uses the Web Share API where
// available (mobile, straight into WhatsApp), falls back to clipboard.
import { track } from "./analytics";
import type { Ayah } from "./types";

function verseText(ayah: Ayah): string {
  return `${ayah.arabic}\n\n“${ayah.translation}”\n\n— Qur’an ${ayah.surah}:${ayah.ayah}\n\nvia MindfulVerse`;
}

/** Returns "shared" | "copied" | "failed" so the caller can confirm in the UI. */
export async function shareVerse(
  ayah: Ayah,
  where: string
): Promise<"shared" | "copied" | "failed"> {
  const text = verseText(ayah);
  track({ type: "share_verse", verseKey: ayah.verseKey, where });
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (err) {
    // user cancelling the share sheet is not a failure worth surfacing
    if (err instanceof DOMException && err.name === "AbortError") return "shared";
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed";
    }
  }
}
