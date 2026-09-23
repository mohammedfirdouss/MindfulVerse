// Reader preferences shared by the surah and juz pages.
import { track } from "./analytics";

export type ReadView = "translation" | "reading";

export const SIZES: { key: string; label: string; scale: number }[] = [
  { key: "s", label: "A", scale: 0.86 },
  { key: "m", label: "A", scale: 1 },
  { key: "l", label: "A", scale: 1.22 },
];

const SIZE_KEY = "mindfulverse.readScale.v1";
const VIEW_KEY = "mindfulverse.readView.v1";

/** "arabic" (the old Arabic-only view) now opens Reading; "both" is Translation. */
export function getReadView(): ReadView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "reading" || v === "arabic" ? "reading" : "translation";
  } catch {
    return "translation";
  }
}

export function saveReadView(v: ReadView): void {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* storage unavailable — the choice lasts this visit */
  }
  track({ type: "read_view", view: v });
}

export function getSizeKey(): string {
  try {
    return localStorage.getItem(SIZE_KEY) ?? "m";
  } catch {
    return "m";
  }
}

export function saveSizeKey(k: string): void {
  try {
    localStorage.setItem(SIZE_KEY, k);
  } catch {
    /* ignore */
  }
}

export function scaleFor(k: string): number {
  return SIZES.find((s) => s.key === k)?.scale ?? 1;
}
