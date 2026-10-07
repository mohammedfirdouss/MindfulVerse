// The designed journal PDF: the app's indigo-on-cotton identity, its mark and
// its Fraunces type. Imported lazily by the Journal page, so pdf-lib never
// weighs on app start.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  exportedLabel,
  spanLabel,
  hasTranslations,
  TRANSLATION_CREDIT,
  type ExportInput,
} from "./journalExport";

// The light palette from index.css — print is always on cotton.
const hex = (h: string) =>
  rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  cotton: hex("#f5efe2"),
  raised: hex("#fbf7ec"),
  shea: hex("#e8dcc3"),
  indigo: hex("#2a3a8c"),
  indigoDeep: hex("#1b2559"),
  indigoWash: hex("#dfe3f2"),
  ink: hex("#221d15"),
  inkSoft: hex("#57503f"),
  inkFaint: hex("#8a8168"),
  line: hex("#ddd3bc"),
  ochre: hex("#c4622d"),
};

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_X = 56;
const TOP = PAGE_H - 78; // below the adire band
const BOTTOM = 64; // above the footer
const TEXT_W = PAGE_W - MARGIN_X * 2;

/** Break text into lines that fit `width`, keeping the writer's own newlines. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (para.trim() === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the column: hard-break it.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
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
  page.drawRectangle({ x: 0, y, width: PAGE_W, height: h, color: C.indigo });
  const cy = y + h / 2;
  for (let x = 10; x < PAGE_W; x += 24) {
    page.drawSvgPath(`M ${x} ${-cy + 4} L ${x + 4} ${-cy} L ${x} ${-cy - 4} L ${x - 4} ${-cy} Z`, {
      borderColor: C.cotton,
      borderWidth: 1,
    });
    page.drawCircle({ x: x + 12, y: cy, size: 1.4, color: C.cotton });
  }
}

/** The app mark: indigo tile, cotton diamond, ochre centre (favicon.svg). */
function drawMark(page: PDFPage, x: number, y: number, size: number) {
  const s = size / 64;
  page.drawRectangle({ x, y, width: size, height: size, color: C.indigo });
  const top = y + size;
  page.drawSvgPath(
    `M ${32 * s} ${10 * s} L ${52 * s} ${32 * s} L ${32 * s} ${54 * s} L ${12 * s} ${32 * s} Z`,
    { x, y: top, borderColor: C.cotton, borderWidth: 4 * s }
  );
  page.drawCircle({ x: x + 32 * s, y: top - 32 * s, size: 5 * s, color: C.ochre });
}

// PDF text can't shape Arabic (joining, marks, right-to-left) or draw colour
// emoji, but the browser's canvas can — with the app's own mushaf font. Such
// lines are rendered crisply at 3x and placed as images.
const RASTER = 3;
const ARABIC_STACK = `"Uthmanic Hafs", "Scheherazade New", "Noto Naskh Arabic", serif`;
// Canvas can't pick a weight from a variable font (it draws the default, the
// Black), so mixed lines use the same static regular cut as the vector text.
const LATIN_FACE = "MindfulVerse PDF Serif";
const MIXED_STACK = `"${LATIN_FACE}", ${ARABIC_STACK}, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;

let latinFace: Promise<void> | null = null;
function loadLatinFace(): Promise<void> {
  latinFace ??= new FontFace(LATIN_FACE, "url(/fonts/pdf/fraunces-regular.ttf)")
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
  opts: { family: string; size: number; leading: number; width: number; color: string; rtl: boolean }
): Promise<RasterLine[]> {
  const fontSpec = `${opts.size}px ${opts.family}`;
  await loadLatinFace();
  await document.fonts.load(fontSpec, str).catch(() => []);
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = fontSpec;
  measure.direction = opts.rtl ? "rtl" : "ltr";

  const lines: string[] = [];
  for (const para of str.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (!line || measure.measureText(next).width <= opts.width) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  const out: RasterLine[] = [];
  for (const line of lines) {
    const w = Math.ceil(Math.min(opts.width, measure.measureText(line).width + 2)) || 1;
    const canvas = document.createElement("canvas");
    canvas.width = w * RASTER;
    canvas.height = Math.ceil(opts.leading * RASTER);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(RASTER, RASTER);
    // An opaque cotton ground: glyphs on a transparent canvas get stem-darkened
    // and print noticeably heavier than the vector text around them.
    ctx.fillStyle = "#f5efe2";
    ctx.fillRect(0, 0, w, opts.leading);
    ctx.font = fontSpec;
    ctx.fillStyle = opts.color;
    ctx.direction = opts.rtl ? "rtl" : "ltr";
    ctx.textAlign = opts.rtl ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(line, opts.rtl ? w - 1 : 1, opts.leading / 2);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) continue;
    out.push({ png: new Uint8Array(await blob.arrayBuffer()), width: w });
  }
  return out;
}

function dayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export async function buildJournalPdf(input: ExportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("MindfulVerse — Your reflections");
  doc.setCreator("MindfulVerse");
  doc.setProducer("MindfulVerse");

  // Static Fraunces instances cut from the app's own variable font
  // (public/fonts/fraunces-2.woff2 → fonttools varLib.instancer, wght 400 /
  // opsz 14 and wght 600 / opsz 36). PDF viewers need TrueType, not WOFF2.
  const [regularBytes, semiboldBytes] = await Promise.all(
    ["/fonts/pdf/fraunces-regular.ttf", "/fonts/pdf/fraunces-semibold.ttf"].map((u) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error(`font ${u}`);
        return r.arrayBuffer();
      })
    )
  );
  const font = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(semiboldBytes, { subset: true });

  const drawable = new Set(font.getCharacterSet());
  const settable = (s: string) =>
    Array.from(s).every((ch) => /\s/.test(ch) || drawable.has(ch.codePointAt(0)!));

  let page!: PDFPage;
  let y = 0;

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.cotton });
    drawBand(page);
    y = TOP;
  }

  /** Ensure `h` points of room, starting a new page if needed. */
  function room(h: number) {
    if (y - h < BOTTOM) newPage();
  }

  const INSET = 16;
  /** The app's verse quote: a pale indigo rule at the inline start. */
  function rule(leading: number) {
    page.drawRectangle({ x: MARGIN_X, y: y - 3, width: 2.5, height: leading, color: C.indigoWash });
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

    if (settable(str)) {
      for (const line of wrap(str, face, opts.size, width)) {
        room(opts.leading);
        y -= opts.leading;
        if (opts.quoted) rule(opts.leading);
        if (line) page.drawText(line, { x, y, size: opts.size, font: face, color: opts.color });
      }
      return;
    }
    // Mixed script (Arabic, emoji…): let the browser set it.
    const c = opts.color;
    const css = `rgb(${Math.round(c.red * 255)}, ${Math.round(c.green * 255)}, ${Math.round(c.blue * 255)})`;
    const lines = await rasterLines(str, {
      family: MIXED_STACK,
      size: opts.size,
      leading: opts.leading,
      width,
      color: css,
      rtl: false,
    });
    for (const l of lines) await image(l, opts.leading, x, false, opts.quoted);
  }

  async function image(l: RasterLine, leading: number, x: number, alignRight: boolean, quoted?: boolean) {
    room(leading);
    y -= leading;
    if (quoted) rule(leading);
    const img = await doc.embedPng(l.png);
    const left = alignRight ? PAGE_W - MARGIN_X - l.width : x;
    // Canvas lines are centred on their leading; nudge to sit like text does.
    page.drawImage(img, { x: left, y: y - leading * 0.28, width: l.width, height: leading });
  }

  newPage();
  drawMark(page, MARGIN_X, y - 34, 34);
  page.drawText("MindfulVerse", { x: MARGIN_X + 46, y: y - 23, size: 15, font: bold, color: C.indigo });
  y -= 84;
  await text("Your reflections", { size: 32, color: C.indigoDeep, leading: 36, face: bold });
  y -= 8;
  await text(spanLabel(input), { size: 11.5, color: C.inkSoft, leading: 16 });
  const exported = exportedLabel(input);
  if (exported) await text(exported, { size: 9.5, color: C.inkFaint, leading: 14 });
  y -= 30;

  for (const section of input.sections) {
    room(96); // never strand a heading at the foot of a page
    y -= 6;
    await text(section.title, { size: 19, color: C.indigo, leading: 24, face: bold });
    y -= 9;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 0.75,
      color: C.line,
    });
    y -= 12;

    for (const { entry, verseLabel, translation, arabic } of section.items) {
      room(90);
      y -= 10;
      // Date as a journal page heading; the time stays quiet beside it.
      const day = dayLabel(entry.createdAt);
      y -= 14;
      page.drawText(day, { x: MARGIN_X, y, size: 10, font: bold, color: C.indigo });
      page.drawText(`  ·  ${timeLabel(entry.createdAt)}`, {
        x: MARGIN_X + bold.widthOfTextAtSize(day, 10),
        y,
        size: 10,
        font,
        color: C.inkFaint,
      });
      y -= 8;

      if (verseLabel) {
        if (arabic) {
          const lines = await rasterLines(arabic, {
            family: ARABIC_STACK,
            size: 19,
            leading: 34,
            width: TEXT_W - INSET,
            color: "#1b2559", // --indigo-deep, as .arabic is in the app
            rtl: true,
          });
          for (const l of lines) await image(l, 34, 0, true, true);
        }
        if (translation) {
          await text(`“${translation}”`, { size: 11, color: C.inkSoft, leading: 16.5, quoted: true });
        }
        await text(verseLabel, { size: 9, color: C.inkFaint, leading: 15, quoted: true });
        y -= 8;
      }

      if (entry.prompt) {
        room(14 + 2 + 20); // keep the prompt with the first line of the reflection
        await text(entry.prompt, { size: 9.5, color: C.inkFaint, leading: 14 });
        y -= 2;
      }
      // The reflection is the point of the page — it gets the largest type.
      await text(entry.body, { size: 13, color: C.ink, leading: 20 });
      y -= 18;
    }
    y -= 10;
  }

  // Closing mark, then the credit.
  room(60);
  y -= 16;
  const cx = PAGE_W / 2;
  page.drawSvgPath(`M ${cx} ${-(y + 6)} L ${cx + 6} ${-y} L ${cx} ${-(y - 6)} L ${cx - 6} ${-y} Z`, {
    borderColor: C.indigo,
    borderWidth: 1,
  });
  page.drawCircle({ x: cx, y, size: 1.6, color: C.ochre });
  y -= 22;

  if (hasTranslations(input)) {
    const w = font.widthOfTextAtSize(TRANSLATION_CREDIT, 8.5);
    room(14);
    y -= 12;
    page.drawText(TRANSLATION_CREDIT, { x: (PAGE_W - w) / 2, y, size: 8.5, font, color: C.inkFaint });
  }

  // Footers last, once the page count is known.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `MindfulVerse · ${i + 1} of ${pages.length}`;
    const w = font.widthOfTextAtSize(label, 8.5);
    p.drawText(label, { x: (PAGE_W - w) / 2, y: 32, size: 8.5, font, color: C.inkFaint });
  });

  return doc.save();
}
