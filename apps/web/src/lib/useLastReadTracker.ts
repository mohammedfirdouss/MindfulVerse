import { useEffect } from "react";
import { parseVerseId } from "./divisions";
import { recordLastRead } from "./progress";

/** The topmost visible verse becomes "last read". Watches both translation
 *  blocks (article.verse) and reading spans (.rv). `fallbackSurah` names the
 *  surah for plain "v{ayah}" ids; `resetKey` re-attaches after the view swaps. */
export function useLastReadTracker(
  enabled: boolean,
  fallbackSurah: number | null,
  resetKey: unknown
): void {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const visible = new Map<string, { surah: number; ayah: number }>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = parseVerseId(e.target.id);
          const surah = v?.surah ?? fallbackSurah;
          if (!v || surah === null) continue;
          const key = `${surah}:${v.ayah}`;
          if (e.isIntersecting) visible.set(key, { surah, ayah: v.ayah });
          else visible.delete(key);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const first = [...visible.values()].sort(
            (a, b) => a.surah - b.surah || a.ayah - b.ayah
          )[0];
          if (first) recordLastRead(first.surah, first.ayah);
        }, 800);
      },
      { rootMargin: "0px 0px -60% 0px" }
    );
    document.querySelectorAll("article.verse, .rv").forEach((el) => observer.observe(el));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled, fallbackSurah, resetKey]);
}
