// Word by word: pairs each Arabic word of a verse with its English meaning.
// The meanings are by Dr. Shehnaz Shaikh and Ms. Kausar Khatri and are shown
// exactly as they wrote them, with their permission. Never edit one here.
import type { WordCell } from "./types";

/** The credit shown beside the meanings and with the app's other credits. */
export const WORD_MEANINGS_CREDIT =
  "Word meanings by Dr. Shehnaz Shaikh and Ms. Kausar Khatri";
export const WORD_MEANINGS_BOOK =
  "The Glorious Qur’an Word-for-Word Translation";
/** Where the authors asked readers to be sent for a printed copy. */
export const WORD_MEANINGS_BOOK_URL = "https://amzn.to/3NVyXoB";

export interface WordPair {
  /** One Arabic word, or two that share a meaning. */
  arabic: string;
  /** Usually one meaning; two where the source splits one Arabic word. */
  meanings: string[];
}

// Marks that sit between words in the Arabic text and are not words.
const NOT_A_WORD = new Set(["۞"]);

/** The verse as word pairs, or null when the meanings do not line up with
 *  the Arabic (the caller then shows the verse without them). */
export function pairWords(
  arabic: string,
  cells: WordCell[] | undefined
): WordPair[] | null {
  if (!cells || cells.length === 0) {
    return null;
  }
  const words = arabic.split(/\s+/u).filter((w) => w && !NOT_A_WORD.has(w));
  const pairs: WordPair[] = [];
  let at = 0;
  for (const cell of cells) {
    const [span, ...meanings] = typeof cell === "string" ? [1, cell] : cell;
    if (at + span > words.length) {
      return null;
    }
    pairs.push({ arabic: words.slice(at, at + span).join(" "), meanings });
    at += span;
  }
  return at === words.length ? pairs : null;
}

/** Long verses show this many words first, with a way to show the rest, so
 *  the Deeper look sheet isn't all words before the explanation. */
export const FIRST_WORDS = 12;
