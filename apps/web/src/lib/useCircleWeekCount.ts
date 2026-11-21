import {
  fetchCircleMemberCount,
  fetchCircleWeekCount,
} from "@mindfulverse/core/circles";
import { useEffect, useState } from "react";

interface Fetched {
  code: string;
  members: number | null;
  reflected: number | null;
}

export interface CircleCounts {
  members: number | null;
  reflected: number | null;
}

/** The circle's member count and weekly reflection count, refetched when the
 *  page becomes visible. Nulls while loading, on error, or without a code. */
export function useCircleCounts(code: string | null): CircleCounts {
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!code) {
      return;
    }
    let active = true;
    const load = () => {
      void Promise.all([
        fetchCircleMemberCount(code),
        fetchCircleWeekCount(code),
      ]).then(([members, reflected]) => {
        if (active) {
          setFetched({ code, members, reflected });
        }
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [code]);

  return fetched && fetched.code === code
    ? { members: fetched.members, reflected: fetched.reflected }
    : { members: null, reflected: null };
}
