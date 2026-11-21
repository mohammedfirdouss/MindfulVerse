// Pure logic for Home's week lines: the private rhythm and the circle count.
// No React Native imports, so vitest runs it.
import { circleMembersLine } from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { rhythmLine, weekRhythm } from "@mindfulverse/core/rhythm";
import type { JournalEntry } from "@mindfulverse/core/types";

export interface RhythmView {
  line: string;
}

/** Null for a week with no entries: Home shows nothing at all. */
export function rhythmView(
  entries: JournalEntry[],
  now: Date
): RhythmView | null {
  const { count } = weekRhythm(entries, now);
  const line = rhythmLine(count);
  if (line === null) {
    return null;
  }
  return { line };
}

/** "5 in Friday friends · 3 reflected this week", or without the name where
 *  the circle is already named above it. Null when there is no circle, the
 *  counts are still loading or failed, or neither reaches two people. */
export function circleCountText(
  circle: Pick<Circle, "name"> | null,
  members: number | null,
  reflected: number | null,
  named = true
): string | null {
  if (!circle) {
    return null;
  }
  return circleMembersLine(named ? circle.name : null, members, reflected);
}
