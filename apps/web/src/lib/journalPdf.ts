import { MARK_RECTS, markBounds } from "@mindfulverse/core/brand";
import fontkit from "@pdf-lib/fontkit";
// The designed journal PDF: the app's indigo-on-cotton identity, its mark and
// its Outfit and Literata type. Imported lazily by the Journal page, so pdf-lib never
// weighs on app start.
import { PDFDocument, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

import {
  exportedLabel,
  spanLabel,
  hasTranslations,
  TRANSLATION_CREDIT,
} from "./journalExport";
import type { ExportInput } from "./journalExport";

// The light palette from index.css — print is always on cotton.
const hex = (h: string) =>
  rgb(
    Number.parseInt(h.slice(1, 3), 16) / 255,
    Number.parseInt(h.slice(3, 5), 16) / 255,
    Number.parseInt(h.slice(5, 7), 16) / 255
  );
const C = {
  // The app's light palette (apps/web/src/index.css :root). Keep in step.
  cotton: hex("#f4f5f8"),
  raised: hex("#fcfcfd"),
  shea: hex("#e9ebf2"),
  indigo: hex("#2a3a8c"),
  indigoDeep: hex("#1b2559"),
  indigoWash: hex("#e3e7f4"),
  ink: hex("#161a2e"),
  inkSoft: hex("#474d66"),
  inkFaint: hex("#666c85"),
  line: hex("#e0e3eb"),
};

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_X = 56;
const TOP = PAGE_H - 78; // below the adire band
const BOTTOM = 64; // above the footer
const TEXT_W = PAGE_W - MARGIN_X * 2;

/** Break text into lines that fit `width`, keeping the writer's own newlines. */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number
): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/u)) {
    if (para.trim() === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/u).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) {
        lines.push(line);
      }
      // A single word wider than the column: hard-break it.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (
          cut > 1 &&
          font.widthOfTextAtSize(rest.slice(0, cut), size) > width
        ) {
          cut--;
        }
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** The adire band: indigo strip with resist-dyed diamonds and dots. */
function drawBand(page: PDFPage) {
  const h = 14;
  const y = PAGE_H - h;
  page.drawRectangle({ color: C.indigo, height: h, width: PAGE_W, x: 0, y });
  const cy = y + h / 2;
  for (let x = 10; x < PAGE_W; x += 24) {
    page.drawSvgPath(
      `M ${x} ${-cy + 4} L ${x + 4} ${-cy} L ${x} ${-cy - 4} L ${x - 4} ${-cy} Z`,
      {
        borderColor: C.cotton,
        borderWidth: 1,
      }
    );
    page.drawCircle({ color: C.cotton, size: 1.4, x: x + 12, y: cy });
  }
}

/** The app mark (packages/core/brand.ts): تدبر in square Kufic, cotton on an
 *  indigo tile, the same construction as the favicon and app icon. */
function drawMark(page: PDFPage, x: number, y: number, size: number) {
  page.drawRectangle({ color: C.indigo, height: size, width: size, x, y });
  const b = markBounds();
  const span = Math.max(b.width, b.height);
  const unit = (size * (1 - 2 * 0.18)) / span; // grid unit in points, 18% padding
  const ox = x + (size - b.width * unit) / 2;
  const top = y + size - (size - b.height * unit) / 2;
  for (const [gx, gy, w, h] of MARK_RECTS) {
    // Grid y runs down; PDF y runs up.
    page.drawRectangle({
      color: C.cotton,
      height: h * unit,
      width: w * unit,
      x: ox + (gx - b.minX) * unit,
      y: top - (gy - b.minY + h) * unit,
    });
  }
}

// PDF text can't shape Arabic (joining, marks, right-to-left) or draw colour
// emoji, but the browser's canvas can — with the app's own mushaf font. Such
// lines are rendered crisply at 3x and placed as images.
const RASTER = 3;
const ARABIC_STACK = `"Uthmanic Hafs", "Scheherazade New", "Noto Naskh Arabic", serif`;
// Mixed-script lines are reflections and translations, so they are set in
// Literata, the app's reading face, from the same static file as the vector text.
const LATIN_FACE = "MindfulVerse PDF Text";
const MIXED_STACK = `"${LATIN_FACE}", ${ARABIC_STACK}, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;

let latinFace: Promise<void> | null = null;
function loadLatinFace(): Promise<void> {
  latinFace ??= new FontFace(LATIN_FACE, "url(/fonts/pdf/literata-regular.ttf)")
    .load()
    .then((f) => {
      document.fonts.add(f);
    })
    .catch(() => {});
  return latinFace;
}

interface RasterLine {
  png: Uint8Array;
  width: number; // points
}

async function rasterLines(
  str: string,
  opts: {
    family: string;
    size: number;
    leading: number;
    width: number;
    color: string;
    rtl: boolean;
  }
): Promise<RasterLine[]> {
  const fontSpec = `${opts.size}px ${opts.family}`;
  await loadLatinFace();
  await document.fonts.load(fontSpec, str).catch(() => []);
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) {
    throw new Error("2D canvas is not available");
  }
  measure.font = fontSpec;
  measure.direction = opts.rtl ? "rtl" : "ltr";

  const lines: string[] = [];
  for (const para of str.split(/\r?\n/u)) {
    let line = "";
    for (const word of para.split(/\s+/u).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (!line || measure.measureText(next).width <= opts.width) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  const out: RasterLine[] = [];
  for (const line of lines) {
    const w =
      Math.ceil(Math.min(opts.width, measure.measureText(line).width + 2)) || 1;
    const canvas = document.createElement("canvas");
    canvas.width = w * RASTER;
    canvas.height = Math.ceil(opts.leading * RASTER);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas is not available");
    }
    ctx.scale(RASTER, RASTER);
    // An opaque cotton ground: glyphs on a transparent canvas get stem-darkened
    // and print noticeably heavier than the vector text around them.
    ctx.fillStyle = "#f4f5f8";
    ctx.fillRect(0, 0, w, opts.leading);
    ctx.font = fontSpec;
    ctx.fillStyle = opts.color;
    ctx.direction = opts.rtl ? "rtl" : "ltr";
    ctx.textAlign = opts.rtl ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(line, opts.rtl ? w - 1 : 1, opts.leading / 2);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png")
    );
    if (!blob) {
      continue;
    }
    out.push({ png: new Uint8Array(await blob.arrayBuffer()), width: w });
  }
  return out;
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

export async function buildJournalPdf(input: ExportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("MindfulVerse | Your reflections");
  doc.setCreator("MindfulVerse");
  doc.setProducer("MindfulVerse");

  // The app's own faces as static TrueType (PDF viewers need TrueType, not
  // WOFF2): Outfit for labels and headings, Literata for reading text.
  const [regularBytes, semiboldBytes, textBytes] = await Promise.all(
    [
      "/fonts/pdf/outfit-regular.ttf",
      "/fonts/pdf/outfit-semibold.ttf",
      "/fonts/pdf/literata-regular.ttf",
    ].map((u) =>
      fetch(u).then((r) => {
        if (!r.ok) {
          throw new Error(`font ${u}`);
        }
        return r.arrayBuffer();
      })
    )
  );
  const font = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(semiboldBytes, { subset: true });
  const reading = await doc.embedFont(textBytes, { subset: true });

  const drawable = new Map<PDFFont, Set<number>>();
  const settable = (s: string, face: PDFFont) => {
    let set = drawable.get(face);
    if (!set) {
      drawable.set(face, (set = new Set(face.getCharacterSet())));
    }
    return [...s].every(
      (ch) => /\s/u.test(ch) || set.has(ch.codePointAt(0) ?? -1)
    );
  };

  let page!: PDFPage;
  let y = 0;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({
      color: C.cotton,
      height: PAGE_H,
      width: PAGE_W,
      x: 0,
      y: 0,
    });
    drawBand(page);
    y = TOP;
  }

  /** Ensure `h` points of room, starting a new page if needed. */
  function room(h: number) {
    if (y - h < BOTTOM) {
      newPage();
    }
  }

  const INSET = 16;
  /** The app's verse quote: a pale indigo rule at the inline start. */
  function rule(leading: number) {
    page.drawRectangle({
      color: C.indigoWash,
      height: leading,
      width: 2.5,
      x: MARGIN_X,
      y: y - 3,
    });
  }

  type Color = ReturnType<typeof rgb>;
  interface TextOpts {
    size: number;
    color: Color;
    leading: number;
    face?: PDFFont;
    quoted?: boolean; // indented, with the quote rule
  }

  async function text(str: string, opts: TextOpts) {
    const x = opts.quoted ? MARGIN_X + INSET : MARGIN_X;
    const width = opts.quoted ? TEXT_W - INSET : TEXT_W;
    const face = opts.face ?? font;

    if (settable(str, face)) {
      for (const line of wrap(str, face, opts.size, width)) {
        room(opts.leading);
        y -= opts.leading;
        if (opts.quoted) {
          rule(opts.leading);
        }
        if (line) {
          page.drawText(line, {
            color: opts.color,
            font: face,
            size: opts.size,
            x,
            y,
          });
        }
      }
      return;
    }
    // Mixed script (Arabic, emoji…): let the browser set it.
    const c = opts.color;
    const css = `rgb(${Math.round(c.red * 255)}, ${Math.round(c.green * 255)}, ${Math.round(c.blue * 255)})`;
    const lines = await rasterLines(str, {
      color: css,
      family: MIXED_STACK,
      leading: opts.leading,
      rtl: false,
      size: opts.size,
      width,
    });
    for (const l of lines) {
      await image(l, opts.leading, x, false, opts.quoted);
    }
  }

  async function image(
    l: RasterLine,
    leading: number,
    x: number,
    alignRight: boolean,
    quoted?: boolean
  ) {
    room(leading);
    y -= leading;
    if (quoted) {
      rule(leading);
    }
    const img = await doc.embedPng(l.png);
    const left = alignRight ? PAGE_W - MARGIN_X - l.width : x;
    // Canvas lines are centred on their leading; nudge to sit like text does.
    page.drawImage(img, {
      height: leading,
      width: l.width,
      x: left,
      y: y - leading * 0.28,
    });
  }

  newPage();
  drawMark(page, MARGIN_X, y - 34, 34);
  page.drawText("MindfulVerse", {
    color: C.indigo,
    font: bold,
    size: 15,
    x: MARGIN_X + 46,
    y: y - 23,
  });
  y -= 84;
  await text("Your reflections", {
    color: C.indigoDeep,
    face: bold,
    leading: 36,
    size: 32,
  });
  y -= 8;
  await text(spanLabel(input), { color: C.inkSoft, leading: 16, size: 11.5 });
  const exported = exportedLabel(input);
  if (exported) {
    await text(exported, { color: C.inkFaint, leading: 14, size: 9.5 });
  }
  y -= 30;

  for (const section of input.sections) {
    room(96); // never strand a heading at the foot of a page
    y -= 6;
    await text(section.title, {
      color: C.indigo,
      face: bold,
      leading: 24,
      size: 19,
    });
    y -= 9;
    page.drawLine({
      color: C.line,
      end: { x: PAGE_W - MARGIN_X, y },
      start: { x: MARGIN_X, y },
      thickness: 0.75,
    });
    y -= 12;

    for (const { entry, verseLabel, translation, arabic } of section.items) {
      room(90);
      y -= 10;
      // Date as a journal page heading; the time stays quiet beside it.
      const day = dayLabel(entry.createdAt);
      y -= 14;
      page.drawText(day, {
        color: C.indigo,
        font: bold,
        size: 10,
        x: MARGIN_X,
        y,
      });
      page.drawText(`  ·  ${timeLabel(entry.createdAt)}`, {
        color: C.inkFaint,
        font,
        size: 10,
        x: MARGIN_X + bold.widthOfTextAtSize(day, 10),
        y,
      });
      y -= 8;

      if (verseLabel) {
        if (arabic) {
          const lines = await rasterLines(arabic, {
            color: "#1b2559", // --indigo-deep, as .arabic is in the app
            family: ARABIC_STACK,
            leading: 34,
            rtl: true,
            size: 19,
            width: TEXT_W - INSET,
          });
          for (const l of lines) {
            await image(l, 34, 0, true, true);
          }
        }
        if (translation) {
          await text(`“${translation}”`, {
            color: C.inkSoft,
            face: reading,
            leading: 16.5,
            quoted: true,
            size: 11,
          });
        }
        await text(verseLabel, {
          color: C.inkFaint,
          leading: 15,
          quoted: true,
          size: 9,
        });
        y -= 8;
      }

      if (entry.prompt) {
        room(14 + 2 + 20); // keep the prompt with the first line of the reflection
        await text(entry.prompt, { color: C.inkFaint, leading: 14, size: 9.5 });
        y -= 2;
      }
      // The reflection is the point of the page — it gets the largest type.
      await text(entry.body, {
        color: C.ink,
        face: reading,
        leading: 20,
        size: 13,
      });
      y -= 18;
    }
    y -= 10;
  }

  // Closing mark, then the credit.
  room(60);
  y -= 16;
  const cx = PAGE_W / 2;
  page.drawSvgPath(
    `M ${cx} ${-(y + 6)} L ${cx + 6} ${-y} L ${cx} ${-(y - 6)} L ${cx - 6} ${-y} Z`,
    {
      borderColor: C.indigo,
      borderWidth: 1,
    }
  );
  page.drawCircle({ color: C.indigo, size: 1.6, x: cx, y });
  y -= 22;

  if (hasTranslations(input)) {
    const w = font.widthOfTextAtSize(TRANSLATION_CREDIT, 8.5);
    room(14);
    y -= 12;
    page.drawText(TRANSLATION_CREDIT, {
      color: C.inkFaint,
      font,
      size: 8.5,
      x: (PAGE_W - w) / 2,
      y,
    });
  }

  // Footers last, once the page count is known.
  const pages = doc.getPages();
  for (const [i, p] of pages.entries()) {
    const label = `MindfulVerse · ${i + 1} of ${pages.length}`;
    const w = font.widthOfTextAtSize(label, 8.5);
    p.drawText(label, {
      color: C.inkFaint,
      font,
      size: 8.5,
      x: (PAGE_W - w) / 2,
      y: 32,
    });
  }

  return doc.save();
}
