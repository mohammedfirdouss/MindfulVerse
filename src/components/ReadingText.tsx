import { Fragment } from "react";
import { toArabicDigits, verseId, type Marks } from "../lib/divisions";
import type { Ayah } from "../lib/types";

/** Every surah except Al-Fatihah (where it is ayah 1) and At-Tawbah opens
 *  with the basmalah in the mushaf. */
export const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Flowing, mushaf-style Arabic: verses run on as one justified passage, each
 *  closed by its numbered end-of-ayah mark. Tapping a verse selects it. */
export default function ReadingText({
  ayahs,
  marks,
  surahNames,
  headings,
  activeKey,
  onSelect,
}: {
  ayahs: Ayah[];
  marks: Marks | null;
  surahNames: Map<number, string>;
  /** Name each surah section (juz pages); the surah page has its own title. */
  headings: boolean;
  activeKey: string | null;
  onSelect: (a: Ayah) => void;
}) {
  const groups: { surah: number; ayahs: Ayah[] }[] = [];
  for (const a of ayahs) {
    const g = groups[groups.length - 1];
    if (g && g.surah === a.surah) g.ayahs.push(a);
    else groups.push({ surah: a.surah, ayahs: [a] });
  }

  return (
    <div className="reading">
      {groups.map((g) => {
        const from = g.ayahs[0].ayah;
        return (
          <section key={g.surah} className="reading-surah">
            {headings && (
              <h2 className="reading-surah-name">
                {surahNames.get(g.surah) ?? `Surah ${g.surah}`}
                {from > 1 && <span className="muted"> · from verse {from}</span>}
              </h2>
            )}
            {from === 1 && g.surah !== 1 && g.surah !== 9 && (
              <p className="reading-basmalah" lang="ar" dir="rtl">
                {BASMALAH}
              </p>
            )}
            <p className="reading-text" lang="ar" dir="rtl">
              {g.ayahs.map((a) => (
                <Fragment key={a.verseKey}>
                  {marks?.rub.has(a.verseKey) && (
                    <span className="reading-rub" aria-hidden="true">
                      ۞{" "}
                    </span>
                  )}
                  <span
                    id={verseId(a.surah, a.ayah)}
                    className={a.verseKey === activeKey ? "rv active" : "rv"}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(a)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(a);
                      }
                    }}
                  >
                    {a.arabic}{" "}
                    <span className="ayah-end">{toArabicDigits(a.ayah)}</span>
                  </span>{" "}
                </Fragment>
              ))}
            </p>
          </section>
        );
      })}
    </div>
  );
}
