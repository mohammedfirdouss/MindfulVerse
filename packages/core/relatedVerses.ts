// "Other verses on this topic" for the Deeper look on a verse.
import type { VerseKey, VerseTopic } from "./types";

/** A topic the verse belongs to, with the other verses under it. */
export interface RelatedTopic {
  name: string;
  verses: VerseKey[];
}

export const MAX_RELATED_TOPICS = 3;

/** The verse's topics, narrowest first, each without the verse itself. */
export function relatedTopics(
  topics: VerseTopic[],
  verseKey: VerseKey,
  max = MAX_RELATED_TOPICS
): RelatedTopic[] {
  return topics
    .filter((t) => t.verses.includes(verseKey))
    .map((t) => ({
      name: t.name,
      verses: t.verses.filter((k) => k !== verseKey),
    }))
    .filter((t) => t.verses.length > 0)
    .sort(
      (a, b) =>
        a.verses.length - b.verses.length || a.name.localeCompare(b.name)
    )
    .slice(0, max);
}

/** "Hardship · 9 other verses". */
export function relatedTopicLabel(topic: RelatedTopic): string {
  const n = topic.verses.length;
  return `${topic.name} · ${n} other ${n === 1 ? "verse" : "verses"}`;
}

/** "Al-A'raf 7:94", or just the key while surah names are unknown. */
export function verseReference(
  verseKey: VerseKey,
  surahNames: Map<number, string> | null
): string {
  const name = surahNames?.get(Number(verseKey.split(":")[0]));
  return name ? `${name} ${verseKey}` : verseKey;
}
