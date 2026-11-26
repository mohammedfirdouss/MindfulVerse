// The surah introduction ("About this surah") is Maududi's introduction from
// Tafhim al-Qur'an. Readers want to see why a surah was revealed, not only
// when, so the text is split into its own sections and the background is
// shown first under a plain heading. Nothing is invented: a surah whose
// introduction has no background section never shows "Why it was revealed",
// and paragraph text is never changed.

export const INTRO_CREDIT =
  "Introduction from Tafhim al-Qur'an (The Meaning of the Qur'an) by Sayyid Abul A'la Maududi.";

export type IntroKind = "why" | "when" | "other";

export interface IntroSection {
  heading: string | null;
  paragraphs: string[];
  kind: IntroKind;
}

export interface IntroBlock {
  kind: "heading" | "paragraph";
  text: string;
}

const WHY_HEADING = "Why it was revealed";
const WHEN_HEADING = "When it was revealed";

// Exact headings (case-insensitive, trimmed) found in the introductions.
const WHY_SOURCES = new Set([
  "historical background",
  "background",
  "occasion of revelation",
  "historical and geographical background",
]);
const WHEN_SOURCES = new Set([
  "period of revelation",
  "the period of revelation",
  "time of revelation",
]);

// A background section often runs through its own subheadings ("Conquest of
// Arabia", "Campaign to Tabuk") or a lead-in line ("The following is the
// background of the Surah:"). It stays together until the next top-level
// heading: the name, the period, or the theme, subject or topics.
const TOP_LEVEL =
  /^(?:name|theme|subject|topics|central theme|main themes|summary|sequence)\b/iu;

const HEADING_MAX_CHARS = 60;

/** The same rule the apps have always used: a short line without a full stop
 *  is a heading or subheading. */
export function isIntroHeading(paragraph: string): boolean {
  return paragraph.length < HEADING_MAX_CHARS && !paragraph.includes(".");
}

function kindOf(heading: string): IntroKind {
  const key = heading.trim().toLowerCase();
  if (WHY_SOURCES.has(key)) {
    return "why";
  }
  if (WHEN_SOURCES.has(key)) {
    return "when";
  }
  return "other";
}

function displayHeading(heading: string, kind: IntroKind): string {
  if (kind === "why") {
    return WHY_HEADING;
  }
  if (kind === "when") {
    return WHEN_HEADING;
  }
  return heading;
}

function endsBackground(heading: string): boolean {
  return kindOf(heading) !== "other" || TOP_LEVEL.test(heading.trim());
}

/** Sections in source order, before any reordering. */
function sourceSections(text: string): IntroSection[] {
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  const sections: IntroSection[] = [];
  let current: IntroSection | null = null;
  for (const p of paragraphs) {
    const heading = isIntroHeading(p);
    const keepInBackground =
      heading && current?.kind === "why" && !endsBackground(p);
    if (heading && !keepInBackground) {
      const kind = kindOf(p);
      current = { heading: displayHeading(p, kind), kind, paragraphs: [] };
      sections.push(current);
    } else if (current) {
      current.paragraphs.push(p);
    } else {
      current = { heading: null, kind: "other", paragraphs: [p] };
      sections.push(current);
    }
  }
  return sections;
}

/** The introduction as sections: why it was revealed first (when the text has
 *  a background section), then every other section in source order. */
export function introSections(text: string): IntroSection[] {
  const sections = sourceSections(text);
  return [
    ...sections.filter((s) => s.kind === "why"),
    ...sections.filter((s) => s.kind !== "why"),
  ];
}

/** Sections flattened for rendering: each heading, then its paragraphs, with
 *  a subheading kept inside a background section shown as a heading. */
export function introBlocks(text: string): IntroBlock[] {
  const blocks: IntroBlock[] = [];
  for (const s of introSections(text)) {
    if (s.heading !== null) {
      blocks.push({ kind: "heading", text: s.heading });
    }
    for (const p of s.paragraphs) {
      blocks.push({
        kind: isIntroHeading(p) ? "heading" : "paragraph",
        text: p,
      });
    }
  }
  return blocks;
}
