import { SIZES, type ReadView } from "../lib/readingPrefs";

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
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div className="reading-controls" role="group" aria-label="Reading size">
        {SIZES.map((s, i) => (
          <button
            key={s.key}
            className="size-btn"
            aria-pressed={s.key === sizeKey}
            onClick={() => onSize(s.key)}
            style={{ fontSize: `${0.78 + i * 0.16}rem` }}
            aria-label={`Reading size ${s.key === "s" ? "small" : s.key === "m" ? "medium" : "large"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="reading-controls" role="group" aria-label="Reading view">
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
    </div>
  );
}
