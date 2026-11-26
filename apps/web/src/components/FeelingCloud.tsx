import {
  CLOUD_COPY,
  cloudFontSize,
  cloudWordLabel,
  fetchFeelingCloud,
} from "@mindfulverse/core/feelingCloud";
import type { FeelingCloud as Cloud } from "@mindfulverse/core/feelingCloud";
import { useState } from "react";

import "./feeling-cloud.css";

const MIN_FONT_PX = 15;
const MAX_FONT_PX = 34;

type View = "closed" | "loading" | Cloud;

/** "See how others felt" on the surah end screen: reveals the anonymous
 *  feelings cloud. Too-few and offline are calm notes, never errors. */
export default function FeelingCloud({ surah }: { surah: number }) {
  const [view, setView] = useState<View>("closed");

  async function load() {
    setView("loading");
    setView(await fetchFeelingCloud(surah));
  }

  if (view === "closed") {
    return (
      <button
        type="button"
        className="btn ghost fc-reveal"
        onClick={() => void load()}
      >
        {CLOUD_COPY.reveal}
      </button>
    );
  }

  return (
    <section className="fc" aria-labelledby="fc-title" aria-live="polite">
      <p id="fc-title" className="eyebrow" style={{ margin: 0 }}>
        {CLOUD_COPY.title}
      </p>
      {view === "loading" && <p className="muted fc-note">Loading…</p>}
      {view === "too-few" && (
        <p className="muted fc-note">{CLOUD_COPY.tooFew}</p>
      )}
      {view === "offline" && (
        <div className="fc-offline">
          <p className="muted fc-note">{CLOUD_COPY.offline}</p>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void load()}
          >
            {CLOUD_COPY.retry}
          </button>
        </div>
      )}
      {Array.isArray(view) && (
        <ul className="fc-words">
          {view.map((t) => (
            <li
              key={t.feeling}
              style={{
                fontSize: `${cloudFontSize(t.readers, view, MIN_FONT_PX, MAX_FONT_PX)}px`,
              }}
            >
              <span aria-hidden="true">{t.feeling}</span>
              <span className="sr-only">{cloudWordLabel(t)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
