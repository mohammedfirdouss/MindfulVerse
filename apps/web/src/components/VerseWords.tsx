import { loadSurahWords } from "@mindfulverse/core/data";
import type { Ayah } from "@mindfulverse/core/types";
import {
  WORD_MEANINGS_BOOK_URL,
  WORD_MEANINGS_CREDIT,
  pairWords,
} from "@mindfulverse/core/wordByWord";
import type { WordPair } from "@mindfulverse/core/wordByWord";
import { useEffect, useState } from "react";

/** The verse word by word: each Arabic word over its meaning, with the
 *  authors' credit beside it. Until the meanings load, or if they can't be
 *  read, the verse shows as plain Arabic. */
export default function VerseWords({ ayah }: { ayah: Ayah }) {
  const [pairs, setPairs] = useState<WordPair[] | null>(null);

  useEffect(() => {
    let live = true;
    setPairs(null);
    const load = async () => {
      try {
        const words = await loadSurahWords(ayah.surah);
        if (live) {
          setPairs(pairWords(ayah.arabic, words[String(ayah.ayah)]));
        }
      } catch {
        /* the plain verse below stands in */
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [ayah.surah, ayah.ayah, ayah.arabic]);

  if (!pairs) {
    return (
      <p className="arabic verse-words-plain" lang="ar" dir="rtl">
        {ayah.arabic}
      </p>
    );
  }
  return (
    <section className="verse-words" aria-label="Word by word">
      <ol className="wbw" dir="rtl">
        {pairs.map((p, i) => (
          <li key={i} className="wbw-cell">
            <span className="wbw-ar" lang="ar">
              {p.arabic}
            </span>
            {p.meanings.map((m, j) => (
              <span key={j} className="wbw-en" lang="en" dir="ltr">
                {m}
              </span>
            ))}
          </li>
        ))}
      </ol>
      <p className="muted wbw-credit">
        {WORD_MEANINGS_CREDIT}
        <a
          href={WORD_MEANINGS_BOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get the book
        </a>
      </p>
    </section>
  );
}
