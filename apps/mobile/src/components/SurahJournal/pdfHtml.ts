import { markSvg } from "@mindfulverse/core/brand";

import {
  exportedLabel,
  hasTranslations,
  spanLabel,
  TRANSLATION_CREDIT,
} from "../Journal/journalText";
import type { ExportInput } from "../Journal/journalText";

// The surah journal as print HTML for expo-print: the web PDF's layout
// (apps/web/src/lib/journalPdf.ts) in CSS. Print is always on cotton: the
// light palette from src/theme.ts, copied so this stays free of react-native.
const C = {
  cotton: "#f4f5f8",
  indigo: "#2a3a8c",
  indigoDeep: "#1b2559",
  indigoWash: "#e3e7f4",
  ink: "#161a2e",
  inkFaint: "#666c85",
  inkSoft: "#474d66",
  line: "#e0e3eb",
} as const;

export const A4_WIDTH = 595;
export const A4_HEIGHT = 842;

export interface PdfFont {
  family: string;
  weight: number;
  base64: string;
}

/** The app's faces embedded in the page, so print never depends on a network. */
export function fontFaceCss(faces: PdfFont[]): string {
  return faces
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(data:font/ttf;base64,${f.base64}) format("truetype");}`
    )
    .join("");
}

const ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
const ESCAPE_RE = /[&<>"']/gu;

export function escapeHtml(text: string): string {
  return text.replaceAll(ESCAPE_RE, (ch) => ESCAPES[ch] ?? ch);
}

function dayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const BAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="14"><defs><pattern id="b" patternUnits="userSpaceOnUse" width="24" height="14"><rect width="24" height="14" fill="${C.indigo}"/><path d="M10 3 L14 7 L10 11 L6 7 Z" fill="none" stroke="${C.cotton}" stroke-width="1"/><circle cx="22" cy="7" r="1.4" fill="${C.cotton}"/></pattern></defs><rect width="100%" height="14" fill="url(#b)"/></svg>`;

const CLOSING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="M7 1 L13 7 L7 13 L1 7 Z" fill="none" stroke="${C.indigo}" stroke-width="1"/><circle cx="7" cy="7" r="1.6" fill="${C.indigo}"/></svg>`;

function styles(fontCss: string): string {
  return `${fontCss}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:${C.cotton};-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Outfit",system-ui,sans-serif;color:${C.ink}}
.band{position:fixed;top:0;left:0;right:0;height:14px;line-height:0}
.foot{position:fixed;bottom:22pt;left:0;right:0;text-align:center;font-size:8.5pt;color:${C.inkFaint}}
table.frame{width:100%;border-collapse:collapse}
thead td{height:64pt}
tfoot td{height:64pt}
td.page{padding:0 56pt}
.brand{display:flex;align-items:center;gap:12pt;margin-bottom:50pt}
.brand span{font-weight:600;font-size:15pt;color:${C.indigo}}
h1{font-weight:600;font-size:32pt;line-height:36pt;color:${C.indigoDeep};margin:0 0 8pt}
.span{font-size:11.5pt;line-height:16pt;color:${C.inkSoft};margin:0}
.exported{font-size:9.5pt;line-height:14pt;color:${C.inkFaint};margin:0}
section{margin-top:30pt}
h2{font-weight:600;font-size:19pt;line-height:24pt;color:${C.indigo};margin:0;padding-bottom:9pt;border-bottom:0.75pt solid ${C.line};break-after:avoid}
.item{margin-top:24pt}
.date{font-size:10pt;margin:0 0 8pt;break-after:avoid}
.date b{font-weight:600;color:${C.indigo}}
.date span{color:${C.inkFaint}}
.verse{border-left:2.5pt solid ${C.indigoWash};padding-left:13.5pt;margin-bottom:8pt}
.arabic{font-family:"Uthmanic Hafs","Noto Naskh Arabic",serif;direction:rtl;text-align:right;font-size:19pt;line-height:34pt;color:${C.indigoDeep};margin:0}
.translation{font-family:"Literata",Georgia,serif;font-size:11pt;line-height:16.5pt;color:${C.inkSoft};margin:0}
.ref{font-size:9pt;line-height:15pt;color:${C.inkFaint};margin:0}
.prompt{font-size:9.5pt;line-height:14pt;color:${C.inkFaint};margin:0 0 2pt;break-after:avoid}
.body{font-family:"Literata",Georgia,serif;font-size:13pt;line-height:20pt;color:${C.ink};margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.close{text-align:center;margin-top:34pt}
.credit{text-align:center;font-size:8.5pt;color:${C.inkFaint};margin:12pt 0 0}
`;
}

/** The surah journal as a printable document: same order as the page, same
 *  look as the web PDF. Every user and verse string is escaped. */
export function buildSurahJournalHtml(
  input: ExportInput & { title: string },
  fontCss = ""
): string {
  const exported = exportedLabel(input);
  const parts: string[] = [
    `<div class="brand">${markSvg({ ground: C.indigo, ink: C.cotton, pad: 0.18, size: 34 })}<span>MindfulVerse</span></div>`,
    `<h1>${escapeHtml(input.title)}</h1>`,
    `<p class="span">${escapeHtml(spanLabel(input))}</p>`,
  ];
  if (exported) {
    parts.push(`<p class="exported">${escapeHtml(exported)}</p>`);
  }
  for (const section of input.sections) {
    parts.push(`<section><h2>${escapeHtml(section.title)}</h2>`);
    for (const { entry, verseLabel, translation, arabic } of section.items) {
      parts.push(
        `<div class="item"><p class="date"><b>${escapeHtml(dayLabel(entry.createdAt))}</b><span>, ${escapeHtml(timeLabel(entry.createdAt))}</span></p>`
      );
      if (verseLabel) {
        parts.push('<div class="verse">');
        if (arabic) {
          parts.push(`<p class="arabic" lang="ar">${escapeHtml(arabic)}</p>`);
        }
        if (translation) {
          parts.push(`<p class="translation">“${escapeHtml(translation)}”</p>`);
        }
        parts.push(`<p class="ref">${escapeHtml(verseLabel)}</p></div>`);
      }
      if (entry.prompt) {
        parts.push(`<p class="prompt">${escapeHtml(entry.prompt)}</p>`);
      }
      parts.push(`<p class="body">${escapeHtml(entry.body)}</p></div>`);
    }
    parts.push("</section>");
  }
  parts.push(`<div class="close">${CLOSING_SVG}</div>`);
  if (hasTranslations(input)) {
    parts.push(`<p class="credit">${escapeHtml(TRANSLATION_CREDIT)}</p>`);
  }

  // thead/tfoot repeat on every printed page, keeping each page's text clear
  // of the fixed band and footer.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(`MindfulVerse | ${input.title}`)}</title><style>${styles(fontCss)}</style></head><body><div class="band">${BAND_SVG}</div><div class="foot">MindfulVerse</div><table class="frame"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td class="page">${parts.join("")}</td></tr></tbody></table></body></html>`;
}
