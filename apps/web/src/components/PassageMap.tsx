import type { Passage } from "@mindfulverse/core/circlePortion";

/** "Verse 7" or "Verses 7 to 12". */
export function passageRange(p: Passage): string {
  return p.from === p.to ? `Verse ${p.from}` : `Verses ${p.from} to ${p.to}`;
}

/** The surah as a short list of titled passages, folded by default. Tapping
 *  one jumps to its first verse. Titles are shown exactly as the source
 *  writes them. */
export default function PassageMap({
  passages,
  onJump,
}: {
  passages: Passage[];
  onJump: (verse: number) => void;
}) {
  if (passages.length < 2) {
    return null;
  }
  return (
    <details className="passage-map">
      <summary>In this surah: {passages.length} passages</summary>
      <ol>
        {passages.map((p) => (
          <li key={`${p.from}-${p.to}`}>
            <button type="button" onClick={() => onJump(p.from)}>
              <span className="passage-range">{passageRange(p)}</span>
              <span className="passage-title">{p.theme}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="muted passage-credit">{PASSAGE_CREDIT}</p>
    </details>
  );
}

/** The heading above a passage's first verse, in the verse-by-verse view. */
export function PassageHeading({ passage }: { passage: Passage }) {
  return (
    <div className="passage-heading" id={`p${passage.from}`}>
      <span className="passage-range">{passageRange(passage)}</span>
      <h2 className="passage-title">{passage.theme}</h2>
    </div>
  );
}

export const PASSAGE_CREDIT =
  "Passage titles: Ayah Theme, from the Quranic Universal Library (QUL) by Tarteel.";
