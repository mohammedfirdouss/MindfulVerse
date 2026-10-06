// The shared-verse text, identical to web's lib/share.ts verseText() so a
// verse shared from either app reads the same in WhatsApp. Pure: no RN here.
import type { Ayah } from "@mindfulverse/core/types";

export function verseText(ayah: Pick<Ayah, "arabic" | "translation" | "surah" | "ayah">): string {
  return `${ayah.arabic}\n\n“${ayah.translation}”\n\n— Qur’an ${ayah.surah}:${ayah.ayah}\n\nvia MindfulVerse`;
}
