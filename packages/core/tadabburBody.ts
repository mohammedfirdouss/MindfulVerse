export interface TadabburParts {
  lessons?: string;
  reflection?: string;
  action?: string;
  connections?: string;
}

export const TADABBUR_LABELS = {
  action: "Action",
  connections: "Connections",
  lessons: "Lessons",
  reflection: "Reflection",
} as const;

type PartKey = keyof typeof TADABBUR_LABELS;

// Order the parts are written in a body.
const PART_ORDER: readonly PartKey[] = [
  "lessons",
  "reflection",
  "action",
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
