import { SIZES } from "@mindfulverse/core/readingPrefs";
import type { ReadView } from "@mindfulverse/core/readingPrefs";

const SIZE_NAMES: Record<string, string> = {
  l: "large",
  m: "medium",
  s: "small",
};

/** Size and view choices, shown inside the "Reading settings" sheet
 *  (components/ReaderTools.tsx). Each choice applies at once. */
export default function ReadingControls({
  sizeKey,
  onSize,
  view,
  onView,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
  view: ReadView;
  onView: (v: ReadView) => void;
}) {
  return (
    <div className="display-choices">
      <div className="display-choice">
        <p className="display-choice-label" id="rc-size">
          Text size
        </p>
        <div
          className="reading-controls"
          role="group"
          aria-labelledby="rc-size"
        >
          {SIZES.map((s, i) => (
            <button
              key={s.key}
              className="size-btn"
              aria-pressed={s.key === sizeKey}
              onClick={() => onSize(s.key)}
              style={{ fontSize: `${0.82 + i * 0.2}rem` }}
              aria-label={`Reading size ${SIZE_NAMES[s.key] ?? s.key}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="display-choice">
        <p className="display-choice-label" id="rc-view">
          View
        </p>
        <div
          className="reading-controls"
          role="group"
          aria-labelledby="rc-view"
        >
          <button
            className="size-btn"
            aria-pressed={view === "translation"}
            onClick={() => onView("translation")}
          >
            Translation
          </button>
          <button
            className="size-btn"
            aria-pressed={view === "reading"}
            onClick={() => onView("reading")}
          >
            Reading
          </button>
        </div>
        <p className="display-choice-hint">
          {view === "translation"
            ? "Arabic with English, verse by verse."
            : "Arabic only, flowing as on the page."}
        </p>
      </div>
    </div>
  );
}
