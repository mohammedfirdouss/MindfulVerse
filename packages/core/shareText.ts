// The text of a shared verse, the same from web and Android: the verse, where
// it is from, the translator's credit (the licence asks for it wherever the
// translation goes) and a link that opens the verse in the reader.
import { TRANSLATION_CREDIT } from "./translation";
import type { Ayah } from "./types";

export const SITE_ORIGIN = "https://mindfulverse.app";

/** The web address of one verse in the reader. */
export function verseUrl(a: Pick<Ayah, "surah" | "ayah">): string {
  return `${SITE_ORIGIN}/read/${a.surah}?v=${a.ayah}`;
}

/** `surahName` is left out when the surah list hasn't loaded in time. */
export function verseShareText(
  a: Pick<Ayah, "arabic" | "translation" | "surah" | "ayah">,
  surahName?: string
): string {
  const reference = surahName
    ? `Qur’an, ${surahName} ${a.surah}:${a.ayah}`
    : `Qur’an ${a.surah}:${a.ayah}`;
  return [
    a.arabic,
    `“${a.translation}”`,
    `${reference}\n${TRANSLATION_CREDIT}`,
    `Read it on MindfulVerse:\n${verseUrl(a)}`,
  ].join("\n\n");
}

/** How long a share waits for the surah's name before going without it. */
export const SURAH_NAME_WAIT_MS = 300;

/** The surah's name if `names` settles within the wait, else undefined. A
 *  share must open while the tap still counts, so it never waits long. */
export async function surahNameInTime(
  surah: number,
  names: Promise<{ number: number; name: string }[]>,
  waitMs = SURAH_NAME_WAIT_MS
): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), waitMs);
  });
  try {
    const list = await Promise.race([names, late]);
    return list?.find((s) => s.number === surah)?.name;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
