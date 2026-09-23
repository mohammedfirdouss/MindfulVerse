import { useCallback, useEffect, useState } from "react";
import { loadSurahTafsir } from "../lib/data";
import type { Ayah, SurahTafsir } from "../lib/types";
import Sheet from "./Sheet";

/** Per-surah list of ayahs that carry a direct Ibn Kathir entry. */
export type TafsirIndex = Record<string, number[]>;

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah. */
export function coveringFor(index: TafsirIndex | null, a: Ayah): number | null {
  if (!index) return null;
  let best: number | null = null;
  for (const n of index[String(a.surah)] ?? []) {
    if (n <= a.ayah) best = n;
    else break;
  }
  return best;
}

export function commentaryLabel(index: TafsirIndex | null, a: Ayah): string {
  if (!index) return "Commentary isn’t available right now";
  const c = coveringFor(index, a);
  if (c === null) return "No commentary for this verse";
  return c === a.ayah ? "Read the commentary" : `Read the commentary (with verse ${c})`;
}

export function commentaryTitle(a: Ayah, source: number): string {
  return source === a.ayah
    ? `Ibn Kathir · ${a.surah}:${a.ayah}`
    : `Ibn Kathir · on the passage from ${a.surah}:${source}`;
}

/** Loads each surah's tafsir on first request, keyed by surah so a page that
 *  spans surahs (a juz) never shows one surah's commentary on another's verse. */
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

export function CommentaryBody({
  ayah,
  text,
  failed,
}: {
  ayah: Ayah;
  /** null while the tafsir file is still downloading. */
  text: string | null;
  failed: boolean;
}) {
  const paragraphs = (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      <p
        className="arabic"
        lang="ar"
        style={{
          fontSize: "1.4rem",
          lineHeight: 1.9,
          margin: "0 0 14px",
          paddingBottom: 14,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {ayah.arabic}
      </p>
      {failed ? (
        <p className="muted">
          The commentary isn’t available offline yet. Try again when you’re connected.
        </p>
      ) : text === null ? (
        <p className="muted">Opening the commentary…</p>
      ) : (
        <div className="tafsir">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 14 }}>
            Verse quotations inside the commentary follow its classical English edition,
            which differs from the ClearQuran translation shown in the reader.
          </p>
        </div>
      )}
    </>
  );
}

export function CommentarySheet({
  ayah,
  index,
  tafsir,
  onClose,
}: {
  ayah: Ayah;
  index: TafsirIndex | null;
  tafsir: Tafsir;
  onClose: () => void;
}) {
  const covering = coveringFor(index, ayah);
  const { request } = tafsir;
  useEffect(() => {
    request(ayah.surah);
  }, [request, ayah.surah]);
  if (covering === null) return null;
  return (
    <Sheet
      label={`Commentary on verse ${ayah.verseKey}`}
      title={commentaryTitle(ayah, covering)}
      onClose={onClose}
    >
      <CommentaryBody
        ayah={ayah}
        text={tafsir.textFor(ayah, covering)}
        failed={tafsir.failedFor(ayah.surah)}
      />
    </Sheet>
  );
}
