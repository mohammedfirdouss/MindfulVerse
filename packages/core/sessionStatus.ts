/** What a theme session's row says about your progress, the same on web and
 *  Android: "Step 2 of 3" once begun, "Done" when finished, else its length. */
export type SessionStatusKind = "done" | "progress" | "new";

export function sessionStatusText(
  kind: SessionStatusKind,
  step: number | null,
  stepCount: number
): string {
  if (kind === "done") {
    return "Done";
  }
  if (kind === "progress" && stepCount > 0) {
    const at = Math.min(Math.max(step ?? 0, 0), stepCount - 1) + 1;
    return `Step ${at} of ${stepCount}`;
  }
  return `${stepCount} ${stepCount === 1 ? "step" : "steps"}`;
}
