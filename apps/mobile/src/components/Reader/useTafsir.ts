import { useCallback, useState } from "react";
import { loadSurahTafsir } from "@mindfulverse/core/data";
import type { Ayah, SurahTafsir } from "@mindfulverse/core/types";

/** Port of web's useTafsir (components/Commentary.tsx): each surah's Ibn
 *  Kathir file (up to 1.3 MB) loads on the first commentary tap, not with the
 *  surah. Keyed by surah so a slow load can't land on another surah's verse. */
export function useTafsir() {
  const [bySurah, setBySurah] = useState<Record<number, SurahTafsir>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const request = useCallback((surah: number) => {
    setFailed((f) => ({ ...f, [surah]: false }));
    loadSurahTafsir(surah)
      .then((t) => setBySurah((b) => ({ ...b, [surah]: t })))
      .catch(() => setFailed((f) => ({ ...f, [surah]: true })));
  }, []);

  function textFor(a: Ayah, source: number): string | null {
    const t = bySurah[a.surah];
    return t ? (t[String(source)] ?? "") : null;
  }

  function failedFor(surah: number): boolean {
    return !!failed[surah] && !bySurah[surah];
  }

  return { request, textFor, failedFor };
}

export type Tafsir = ReturnType<typeof useTafsir>;
