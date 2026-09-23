import { useState } from "react";
import { Link } from "react-router-dom";
import type { Ayah } from "../lib/types";
import { useShareFeedback } from "../lib/useShareFeedback";
import {
  CommentaryBody,
  commentaryLabel,
  commentaryTitle,
  coveringFor,
  type Tafsir,
  type TafsirIndex,
} from "./Commentary";
import Sheet from "./Sheet";

/** A verse tapped in Reading mode: its translation and what you can do with it.
 *  Commentary opens inside the same sheet, so there is one history entry. */
export default function VerseSheet({
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
  const [showCommentary, setShowCommentary] = useState(false);
  const share = useShareFeedback("reader");
  const covering = coveringFor(index, ayah);

  function openCommentary() {
    if (covering === null) return;
    tafsir.request(ayah.surah);
    setShowCommentary(true);
  }

  const inCommentary = showCommentary && covering !== null;
  return (
    <Sheet
      label={`Verse ${ayah.verseKey}`}
      title={inCommentary ? commentaryTitle(ayah, covering) : `Verse ${ayah.verseKey}`}
      onClose={onClose}
    >
      {inCommentary ? (
        <>
          <button
            className="link-btn"
            style={{ marginBottom: 14 }}
            onClick={() => setShowCommentary(false)}
          >
            ← Back to the verse
          </button>
          <CommentaryBody
            ayah={ayah}
            text={tafsir.textFor(ayah, covering)}
            failed={tafsir.failedFor(ayah.surah)}
          />
        </>
      ) : (
        <>
          <p className="arabic" lang="ar" style={{ fontSize: "1.5rem", lineHeight: 2, margin: "0 0 12px" }}>
            {ayah.arabic}
          </p>
          <p className="translation" style={{ margin: "0 0 6px" }}>
            {ayah.translation}
          </p>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <button className="commentary-open" disabled={covering === null} onClick={openCommentary}>
              {commentaryLabel(index, ayah)}
            </button>
            <button className="commentary-open" onClick={() => void share.share(ayah)}>
              {share.label ?? "Share"}
            </button>
            <Link className="commentary-open" to={`/tadabbur/${ayah.surah}?v=${ayah.ayah}`} replace>
              Reflect on this verse
            </Link>
          </div>
        </>
      )}
    </Sheet>
  );
}
