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
              <PassageTitle theme={p.theme} />
            </button>
          </li>
        ))}
      </ol>
      <p className="muted passage-credit">{PASSAGE_CREDIT}</p>
    </details>
  );
}

/** The source's title, or a plain note where it gives none for these verses. */
function PassageTitle({ theme }: { theme: string }) {
  return theme ? (
    <span className="passage-title">{theme}</span>
  ) : (
    <span className="passage-title passage-untitled">
      No title in the source
    </span>
  );
}

export const PASSAGE_CREDIT =
  "Passage titles: Ayah Theme, from the Quranic Universal Library (QUL) by Tarteel.";
