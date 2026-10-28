// The MindfulVerse mark: تدبر (tadabbur, deep reflection on the Qur'an) in
// square Kufic, built from unit squares on a grid. Every logo surface draws
// from this one construction: favicon, app icons, splash, the web sidebar,
// the journal PDF and the social image (scripts/build-brand.mjs).
//
// Read right to left in two joined pieces, because د and ر never connect to
// the letter after them: تد (tā' with two dots above, then dāl) and بر (bā'
// with one dot below, then rā' dropping below the line).

/** [x, y, width, height] in grid units. */
export type MarkRect = readonly [number, number, number, number];

export const MARK_RECTS: readonly MarkRect[] = [
  // تد
  [13, 7, 1, 4], // tā' tooth
  [12, 5, 1, 1], // tā' dot
  [14, 5, 1, 1], // tā' dot
  [9, 10, 5, 1], // line joining tā' to dāl
  [9, 5, 1, 6], // dāl stem
  [7, 5, 2, 1], // dāl arm, to the left
  // بر
  [5, 8, 1, 3], // bā' tooth
  [5, 12, 1, 1], // bā' dot, below
  [2, 10, 4, 1], // line joining bā' to rā'
  [2, 10, 1, 4], // rā' drop
  [1, 13, 1, 1], // rā' foot, to the left
];

/** The construction's bounding box in grid units. */
export function markBounds(rects: readonly MarkRect[] = MARK_RECTS) {
  const xs = rects.flatMap(([x, , w]) => [x, x + w]);
  const ys = rects.flatMap(([, y, , h]) => [y, y + h]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    height: Math.max(...ys) - minY,
    minX,
    minY,
    width: Math.max(...xs) - minX,
  };
}

export interface MarkSvgOptions {
  /** Glyph colour. */
  ink: string;
  /** Tile colour; omit for a transparent mark (concept A, on a page). */
  ground?: string;
  /** Empty space on each side, as a fraction of the square (0.2 = 20%). */
  pad?: number;
  /** Tile corner radius as a fraction of the square. */
  radius?: number;
  /** Rendered size in px; omit to let the container size it. */
  size?: number;
}

/** The mark as a square SVG string, centred with even padding. With `ground`
 *  it is the app icon (concept B: the word left pale inside indigo). */
export function markSvg({
  ink,
  ground,
  pad = 0.2,
  radius = 0,
  size,
}: MarkSvgOptions): string {
  const b = markBounds();
  const span = Math.max(b.width, b.height);
  const box = span / (1 - 2 * pad);
  const ox = b.minX - (box - b.width) / 2;
  const oy = b.minY - (box - b.height) / 2;
  const dims = size ? ` width="${size}" height="${size}"` : "";
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(ox)} ${r(oy)} ${r(box)} ${r(box)}"${dims}>`;
  if (ground) {
    out += `<rect x="${r(ox)}" y="${r(oy)}" width="${r(box)}" height="${r(box)}" rx="${r(radius * box)}" fill="${ground}"/>`;
  }
  out += `<path fill="${ink}" d="${markPath()}"/>`;
  return `${out}</svg>`;
}

/** All squares as one path, in grid units. */
export function markPath(rects: readonly MarkRect[] = MARK_RECTS): string {
  return rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("");
}

const r = (n: number) => Math.round(n * 1000) / 1000;
