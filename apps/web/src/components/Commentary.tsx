import { commentaryParagraphs } from "@mindfulverse/core/commentaryText";
import { loadSurahTafsir } from "@mindfulverse/core/data";
import type { Ayah, SurahTafsir } from "@mindfulverse/core/types";
import { useCallback, useEffect, useState } from "react";

import { coveringAyah } from "../lib/tafsirCovering";
import RelatedVerses from "./RelatedVerses";
import Sheet from "./Sheet";
import VerseWords from "./VerseWords";

/** Per-surah list of ayahs that carry a direct Ibn Kathir entry. */
export type TafsirIndex = Record<string, number[]>;

/** The entry covering this ayah (see coveringAyah), or null without one. */
export function coveringFor(index: TafsirIndex | null, a: Ayah): number | null {
  if (!index) {
    return null;
  }
  return coveringAyah(index[String(a.surah)] ?? [], a.ayah);
}

export function commentaryLabel(index: TafsirIndex | null, a: Ayah): string {
  if (!index) {
    return "Commentary isn’t available right now";
  }
  const c = coveringFor(index, a);
  if (c === null) {
    return "No commentary for this verse";
  }
  return "Deeper look";
}

export function deeperLookTitle(a: Ayah): string {
  return `Deeper look · ${a.surah}:${a.ayah}`;
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

  return { failedFor, request, textFor };
}

export type Tafsir = ReturnType<typeof useTafsir>;

export function CommentaryBody({
  ayah,
  source,
  text,
  failed,
  onNavigate,
}: {
  ayah: Ayah;
  /** The verse whose Ibn Kathir entry covers this one. */
  source: number;
  /** Called when a related verse is followed, so the sheet can close. */
  onNavigate: () => void;
  /** null while the tafsir file is still downloading. */
  text: string | null;
  failed: boolean;
}) {
  const paragraphs = commentaryParagraphs(text);
  return (
    <>
      <VerseWords ayah={ayah} />
      <RelatedVerses ayah={ayah} onNavigate={onNavigate} />
      <h3 className="deeper-heading">{commentaryTitle(ayah, source)}</h3>
      {failed ? (
        <p className="muted">
          The commentary isn’t available offline yet. Try again when you’re
          connected.
        </p>
      ) : text === null ? (
        <p className="muted">Opening the commentary…</p>
      ) : (
        <div className="tafsir">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 14 }}>
            Verse quotations inside the commentary follow its classical English
            edition, which differs from the ClearQuran translation shown in the
            reader.
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
  if (covering === null) {
    return null;
  }
  return (
    <Sheet
      label={`Deeper look at verse ${ayah.verseKey}`}
      title={deeperLookTitle(ayah)}
      onClose={onClose}
    >
      <CommentaryBody
        ayah={ayah}
        source={covering}
        onNavigate={onClose}
        text={tafsir.textFor(ayah, covering)}
        failed={tafsir.failedFor(ayah.surah)}
      />
    </Sheet>
  );
}
