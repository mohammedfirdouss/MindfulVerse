// The app's palette, faces and adire ornaments, for video. Values mirror
// apps/web/src/index.css; the mark itself comes from packages/core/brand.ts.
import { staticFile } from "remotion";

export const C = {
  cotton: "#f4f5f8",
  indigo: "#2a3a8c",
  indigoDeep: "#1b2559",
  ink: "#161a2e",
  inkFaint: "#666c85",
  inkSoft: "#474d66",
  line: "#c9cedc",
  night: "#12141d",
  nightIndigo: "#b5c2ef",
  nightInk: "#e8eaf2",
  nightRaised: "#191c28",
  nightSoft: "#8b91a8",
  raised: "#fcfcfd",
  wash: "#e3e7f4",
};

export const F = {
  arabic: "UthmanicHafs, serif",
  text: "Literata, serif",
  ui: "Outfit, sans-serif",
};

const face = (family: string, file: string, weight = 400) =>
  `@font-face{font-family:${family};font-weight:${weight};src:url(${staticFile(`fonts/${file}`)}) format("woff2");font-display:block}`;

export const fontCss = [
  face("Outfit", "outfit-medium.woff2", 500),
  face("Outfit", "outfit-semibold.woff2", 600),
  face("Literata", "literata-regular.woff2"),
  face("UthmanicHafs", "uthmanic-hafs.woff2"),
].join("");

/** One tile of adire resist motifs (the app's cloth panel), as a data URI. */
export function clothTile(ink: string, opacity = 0.13, s = 88): string {
  const m = s / 2;
  const d = s * 0.26;
  const d2 = d * 0.45;
  const r = s * 0.09;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><g fill="none" stroke="${ink}" stroke-width="2.4" opacity="${opacity}">` +
    `<path d="M${m} ${m - d}L${m + d} ${m}L${m} ${m + d}L${m - d} ${m}Z"/>` +
    `<path d="M${m} ${m - d2}L${m + d2} ${m}L${m} ${m + d2}L${m - d2} ${m}Z" fill="${ink}" stroke="none"/>${[
      [0, 0],
      [s, 0],
      [0, s],
      [s, s],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
      .join(
        ""
      )}<path d="M${m - 6} 0H${m + 6}M${m - 6} ${s}H${m + 6}M0 ${m - 6}V${m + 6}M${s} ${m - 6}V${m + 6}" stroke-linecap="round"/>` +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** The adire band: diamond and ringed dot, repeated. */
export function bandTile(ground: string, ink: string, h = 30): string {
  const k = h / 12;
  const w = 36 * k;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${ground}"/>` +
    `<path d="M${9 * k} ${k}L${14 * k} ${6 * k}L${9 * k} ${11 * k}L${4 * k} ${6 * k}Z" fill="none" stroke="${ink}" stroke-width="${1.2 * k}"/>` +
    `<circle cx="${27 * k}" cy="${6 * k}" r="${2.4 * k}" fill="none" stroke="${ink}" stroke-width="${1.2 * k}"/>` +
    `<circle cx="${27 * k}" cy="${6 * k}" r="${0.9 * k}" fill="${ink}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
