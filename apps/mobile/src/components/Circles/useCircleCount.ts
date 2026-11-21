// The anonymous "5 in <circle>, 3 reflected this week." line (no name where
// the circle is already named above it), fetched when the screen gains focus,
// at most once every two minutes per circle; in between the last answer is
// shown. Null while loading, on error, or when neither count reaches two.
import {
  fetchCircleMemberCount,
  fetchCircleWeekCount,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { circleCountText } from "../Home/weekModel";
import { createThrottle } from "./throttle";

interface Counts {
  members: number | null;
  reflected: number | null;
}

// Shared by every screen showing a count, so Home and Circles don't each ask.
const throttle = createThrottle();
const lastCounts = new Map<string, Promise<Counts>>();

async function fetchCounts(code: string): Promise<Counts> {
  const [members, reflected] = await Promise.all([
    fetchCircleMemberCount(code),
    fetchCircleWeekCount(code),
  ]);
  return { members, reflected };
}

export function useCircleCountLine(
  circle: Pick<Circle, "code" | "name"> | null,
  { named = true }: { named?: boolean } = {}
): string | null {
  const code = circle?.code ?? null;
  const [counts, setCounts] = useState<{ code: string } & Counts>();

  useFocusEffect(
    useCallback(() => {
      if (!code) {
        return;
      }
      if (throttle.due(code, Date.now())) {
        lastCounts.set(code, fetchCounts(code));
      }
      let alive = true;
      void lastCounts.get(code)?.then((c) => {
        if (alive) {
          setCounts({ code, ...c });
        }
      });
      return () => {
        alive = false;
      };
    }, [code])
  );

  // A count fetched for a previous circle is never shown for this one.
  const fresh = counts?.code === code ? counts : undefined;
  return circleCountText(
    circle,
    fresh?.members ?? null,
    fresh?.reflected ?? null,
    named
  );
}
