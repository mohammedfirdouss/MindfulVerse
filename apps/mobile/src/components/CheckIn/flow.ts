// The check-in asks one thing at a time: feeling first, then the verse, then
// an optional reflection (web: apps/web/src/pages/CheckIn.tsx).
export type CheckInStage = "feel" | "verse";

/** Where the check-in opens. Someone who already checked in today, or who
 *  left a reflection half-written, goes straight to the verse — never back to
 *  the feeling question, and never away from their words. */
export function openingStage(checkedIn: boolean, draft: string): CheckInStage {
  return checkedIn || draft.trim().length > 0 ? "verse" : "feel";
}

/** The quiet note beside "Keep in journal". */
export function keepNote(body: string, kept: boolean): "kept" | "draft" | null {
  if (body.trim().length > 0) {
    return "draft";
  }
  return kept ? "kept" : null;
}
