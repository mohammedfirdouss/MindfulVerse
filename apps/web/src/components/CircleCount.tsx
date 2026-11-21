import { circleMembersLine } from "@mindfulverse/core/circles";

import { useCircleCounts } from "../lib/useCircleWeekCount";

import "./week.css";

/** "5 in Friday friends · 3 reflected this week", or "5 people in this
 *  circle" with no name. Each number shows only at two or more. */
export default function CircleCount({
  code,
  name,
  className,
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const { members, reflected } = useCircleCounts(code);
  const line = circleMembersLine(name ?? null, members, reflected);
  if (line === null) {
    return null;
  }
  return (
    <p className={className ? `circle-count ${className}` : "circle-count"}>
      {line}
    </p>
  );
}
