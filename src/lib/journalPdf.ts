// The designed journal PDF: the app's indigo-on-cotton identity, its mark and
// its Fraunces type. Imported lazily by the Journal page, so pdf-lib never
// weighs on app start.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  countEntries,
  formatDate,
  formatDay,
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

  // Characters the Latin face can't draw (Arabic, emoji) are left out of the
  // PDF rather than printed as boxes; the plain-text export keeps everything.
  const drawable = new Set(font.getCharacterSet());
  const clean = (s: string) =>
    Array.from(s)
      .filter((ch) => ch === "\n" || drawable.has(ch.codePointAt(0)!))
      .join("")
      .replace(/[ \t]{2,}/g, " ");
  const loses = (s: string) =>
    Array.from(s).some((ch) => !/\s/.test(ch) && !drawable.has(ch.codePointAt(0)!));

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

  function text(
    str: string,
    opts: {
      size: number;
      color: ReturnType<typeof rgb>;
      leading: number;
      x?: number;
      width?: number;
      face?: PDFFont;
    }
  ) {
    const x = opts.x ?? MARGIN_X;
    const face = opts.face ?? font;
    for (const line of wrap(clean(str), face, opts.size, opts.width ?? TEXT_W)) {
      room(opts.leading);
      y -= opts.leading;
      if (line) page.drawText(line, { x, y, size: opts.size, font: face, color: opts.color });
    }
  }

  // --- Title block ---
  newPage();
  const n = countEntries(input);
  drawMark(page, MARGIN_X, y - 34, 34);
  page.drawText("MindfulVerse", {
    x: MARGIN_X + 46,
    y: y - 23,
    size: 15,
    font: bold,
    color: C.indigo,
  });
  y -= 76;
  text("Your reflections", { size: 30, color: C.indigoDeep, leading: 34, face: bold });
  y -= 6;
  text(
    `Exported ${formatDay(input.exportedAt)} · ${n} ${n === 1 ? "reflection" : "reflections"}`,
    { size: 11, color: C.inkFaint, leading: 15 }
  );
  y -= 26;

  // --- Sections ---
  for (const section of input.sections) {
    room(80); // never strand a heading at the foot of a page
    y -= 8;
    text(section.title, { size: 18, color: C.indigo, leading: 22, face: bold });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_W - MARGIN_X, y },
      thickness: 0.75,
      color: C.line,
    });
    y -= 10;

    for (const { entry, verseLabel, translation } of section.items) {
      room(70);
      y -= 8;
      text(formatDate(entry.createdAt), { size: 9.5, color: C.indigo, leading: 13, face: bold });

      if (verseLabel) {
        // A quiet rule at the inline start, like the app's verse quote.
        const startY = y;
        y -= 4;
        const inset = 14;
        if (translation) {
          text(`“${translation}”`, {
            size: 11,
            color: C.inkSoft,
            leading: 16,
            x: MARGIN_X + inset,
            width: TEXT_W - inset,
          });
        }
        text(verseLabel, {
          size: 9,
          color: C.inkFaint,
          leading: 14,
          x: MARGIN_X + inset,
          width: TEXT_W - inset,
        });
        if (y < startY) {
          page.drawRectangle({
            x: MARGIN_X,
            y: y - 2,
            width: 2.5,
            height: Math.min(startY - y, TOP - y),
            color: C.indigoWash,
          });
        }
      }

      if (entry.prompt) {
        y -= 6;
        text(entry.prompt, { size: 10.5, color: C.inkSoft, leading: 15 });
      }
      y -= 4;
      text(entry.body, { size: 12, color: C.ink, leading: 18.5 });
      if (loses(entry.body)) {
        y -= 2;
        text(
          "Some characters here (such as Arabic script or emoji) can’t be shown in a PDF. The plain-text download keeps them.",
          { size: 8.5, color: C.inkFaint, leading: 12 }
        );
      }
      y -= 14;
    }
    y -= 10;
  }

  if (hasTranslations(input)) {
    room(30);
    y -= 10;
    text(TRANSLATION_CREDIT, { size: 8.5, color: C.inkFaint, leading: 12 });
  }

  // --- Footers, once the page count is known ---
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `MindfulVerse · ${i + 1} of ${pages.length}`;
    const w = font.widthOfTextAtSize(label, 8.5);
    p.drawText(label, { x: (PAGE_W - w) / 2, y: 32, size: 8.5, font, color: C.inkFaint });
  });

  return doc.save();
}
