import type { Ayah } from "../lib/types";
import { useShareFeedback } from "../lib/useShareFeedback";
import { commentaryLabel, coveringFor, type TafsirIndex } from "./Commentary";

export default function VerseBlock({
  ayah,
  id,
  index,
  onCommentary,
  flash = false,
}: {
  ayah: Ayah;
  id: string;
  index: TafsirIndex | null;
  onCommentary: (a: Ayah) => void;
  /** Briefly highlighted after a deep link lands here. */
  flash?: boolean;
}) {
  const share = useShareFeedback("reader");
  const covering = coveringFor(index, ayah);
  return (
    <article id={id} className={flash ? "verse flash" : "verse"} style={{ scrollMarginTop: 16 }}>
      <div className="verse-head">
        <span className="roundel">{ayah.ayah}</span>
        <span className="rule" />
      </div>
      <p className="arabic" lang="ar">
        {ayah.arabic}
      </p>
      <p className="translation">{ayah.translation}</p>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="commentary-open"
          disabled={covering === null}
          onClick={() => onCommentary(ayah)}
        >
          {commentaryLabel(index, ayah)}
        </button>
        <button className="commentary-open" onClick={() => void share.share(ayah)}>
          {share.label ?? "Share"}
        </button>
      </div>
    </article>
  );
}
