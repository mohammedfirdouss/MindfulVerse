import {
  BRIEF_CREDIT,
  BRIEF_HEADING,
  briefFor,
  briefSharedLabel,
} from "@mindfulverse/core/brief";
import type { Brief } from "@mindfulverse/core/brief";
import { loadSurahBrief } from "@mindfulverse/core/data";
import type { Ayah } from "@mindfulverse/core/types";
import { useEffect, useState } from "react";

/** "In short": Al-Mukhtasar's explanation of the verse, with its credit.
 *  Renders nothing until it loads, or if it can't be read. */
export default function VerseBrief({ ayah }: { ayah: Ayah }) {
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    let live = true;
    setBrief(null);
    const load = async () => {
      try {
        const all = await loadSurahBrief(ayah.surah);
        if (live) {
          setBrief(briefFor(all, ayah.ayah));
        }
      } catch {
        /* the rest of the Deeper look stands on its own */
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [ayah.surah, ayah.ayah]);

  if (!brief) {
    return null;
  }
  const shared = briefSharedLabel(brief, ayah.ayah);
  return (
    <section className="brief" aria-label={BRIEF_HEADING}>
      <h3 className="deeper-heading">{BRIEF_HEADING}</h3>
      <div className="tafsir">
        {brief.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="muted brief-credit">
        {shared ? `${shared}. ` : ""}
        {BRIEF_CREDIT}
      </p>
    </section>
  );
}
