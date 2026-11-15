// Lays out an Ibn Kathir entry for reading. The words are never changed: this
// only adds the breaks and spaces the source dataset lost.

// The entry opens with the verses it covers, each ending in its number, run
// together: `…deeds? (103)"Those whose…`. A number followed directly by text
// ends a verse.
const VERSE_END = /(\(\d{1,3}\))(?=[^\s.,;:)\]])/gu;

// A sentence that runs into the next: `…him said.However, he…`. An apostrophe
// after the full stop is left alone, since it may open a name ('Ali).
const RUN_ON = /([a-z][.?!]"?)(?=[A-Z])/gu;

function splitVerses(opening: string): string[] {
  return opening.replaceAll(VERSE_END, "$1\n\n").split("\n\n");
}

/** The entry as paragraphs: one per quoted verse, then the commentary. */
export function commentaryParagraphs(
  text: string | null | undefined
): string[] {
  const [opening = "", ...rest] = (text ?? "").split("\n\n");
  return [...splitVerses(opening), ...rest]
    .map((p) => p.trim().replaceAll(RUN_ON, "$1 "))
    .filter(Boolean);
}
