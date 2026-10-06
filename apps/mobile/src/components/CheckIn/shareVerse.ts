// Native port of web's lib/share.ts: the OS share sheet instead of the Web
// Share API. There is no clipboard fallback (no expo-clipboard yet), so the
// result is never "copied". The share_verse event fires as on web: on the tap,
// before the sheet opens.
import { Share } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import type { Ayah } from "@mindfulverse/core/types";
import { verseText } from "./verseText";

export type ShareResult = "shared" | "cancelled" | "failed";

export async function shareVerse(ayah: Ayah, where: string): Promise<ShareResult> {
  track({ type: "share_verse", verseKey: ayah.verseKey, where });
  try {
    const r = await Share.share({ message: verseText(ayah) });
    // iOS reports a dismissed sheet; Android always reports sharedAction.
    return r.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    return "failed";
  }
}
