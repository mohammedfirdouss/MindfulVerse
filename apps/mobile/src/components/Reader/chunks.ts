// Reading view (flowing mushaf-style Arabic) as list rows. Web renders a whole
// surah as one paragraph; on native one 286-ayah <Text> can't be virtualised
// and would lay out all at once, so the passage is cut at ayah boundaries into
// paragraphs of roughly `targetChars` characters, each a FlatList row.
import type { Ayah } from "@mindfulverse/core/types";

export interface ReadingChunk {
  key: string;
  first: number;
  last: number;
  ayahs: Ayah[];
}

/** ~600 characters of Uthmani text is a handful of short ayahs or one long
 *  one: a few screen-lines at the default size, cheap to lay out. */
export const CHUNK_TARGET_CHARS = 600;

export function chunkAyahs(
  ayahs: Ayah[],
  targetChars: number = CHUNK_TARGET_CHARS
): ReadingChunk[] {
  const chunks: ReadingChunk[] = [];
  let current: Ayah[] = [];
  let size = 0;
  const flush = () => {
    const last = current.at(-1);
    if (last === undefined) {
      return;
    }
    const [first] = current;
    chunks.push({
      ayahs: current,
      first: first.ayah,
      key: `${first.surah}:${first.ayah}`,
      last: last.ayah,
    });
    current = [];
    size = 0;
  };
  for (const a of ayahs) {
    // Start a new paragraph rather than overshoot; one long ayah stands alone.
    if (current.length > 0 && size + a.arabic.length > targetChars) {
      flush();
    }
    current.push(a);
    size += a.arabic.length;
  }
  flush();
  return chunks;
}

/** Index of the row covering `ayah` in rows given as {first,last} ranges. */
export function rowIndexFor(
  rows: { first: number; last: number }[],
  ayah: number
): number {
  return rows.findIndex((r) => r.first <= ayah && ayah <= r.last);
}
