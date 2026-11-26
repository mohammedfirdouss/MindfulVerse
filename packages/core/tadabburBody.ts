export interface TadabburParts {
  feeling?: string;
  reminder?: string;
  takeaway?: string;
  research?: string;
  lessons?: string;
  reflection?: string;
  action?: string;
  connections?: string;
}

export const TADABBUR_LABELS = {
  action: "Action",
  connections: "Connections",
  feeling: "Feeling",
  lessons: "Lessons",
  reflection: "Reflection",
  reminder: "Reminded me of",
  research: "To look into",
  takeaway: "Takeaway",
} as const;

export type PartKey = keyof typeof TADABBUR_LABELS;

// Order the parts are written in a body, and shown wherever they are rendered.
export const PART_ORDER: readonly PartKey[] = [
  "feeling",
  "reminder",
  "takeaway",
  "lessons",
  "reflection",
  "action",
  "research",
  "connections",
];

const PARAGRAPH_BREAK = "\n\n";

export function formatTadabburBody(parts: TadabburParts): string {
  const paragraphs: string[] = [];
  for (const key of PART_ORDER) {
    const value = parts[key]?.trim();
    if (value) {
      paragraphs.push(`${TADABBUR_LABELS[key]}: ${value}`);
    }
  }
  return paragraphs.join(PARAGRAPH_BREAK);
}

// A blank action leaves the reflection exactly as session entries were always
// saved; an action switches to labelled parts so follow-ups can find it.
export function formatSessionBody(reflection: string, action: string): string {
  if (!action.trim()) {
    return reflection.trim();
  }
  return formatTadabburBody({ action, reflection });
}

function labelOf(paragraph: string): PartKey | null {
  for (const key of PART_ORDER) {
    if (paragraph.startsWith(`${TADABBUR_LABELS[key]}: `)) {
      return key;
    }
  }
  return null;
}

// Returns null when the body does not start with a labelled paragraph, so
// callers can show free text whole.
export function parseTadabburBody(body: string): TadabburParts | null {
  const result: TadabburParts = {};
  let current: PartKey | null = null;
  for (const paragraph of body.split(PARAGRAPH_BREAK)) {
    const key = labelOf(paragraph);
    if (key) {
      current = key;
      const text = paragraph.slice(TADABBUR_LABELS[key].length + 2);
      result[key] =
        result[key] === undefined
          ? text
          : `${result[key]}${PARAGRAPH_BREAK}${text}`;
    } else if (current) {
      result[current] =
        `${result[current] ?? ""}${PARAGRAPH_BREAK}${paragraph}`;
    } else {
      return null;
    }
  }
  return current ? result : null;
}
