// The surah Tadabbur prompts: copy, the feelings list, and how a draft becomes
// a saved body. Platform-neutral; the web and Android screens render it.
import { formatTadabburBody } from "./tadabburBody";

export const FEELINGS = [
  "Peaceful",
  "Hopeful",
  "Grateful",
  "Moved",
  "Reassured",
  "Humbled",
  "Convicted",
  "Uneasy",
  "Afraid",
  "Confused",
  "Curious",
  "Longing",
] as const;

export const MAX_FEELINGS = 3;

export const PROMPT_INTRO =
  "There are no right answers. Be honest; only you see this.";

export const PROMPTS = {
  actionPlaceholder: "One thing you'll do (optional)",
  feeling: "How did this verse make you feel?",
  feelingPlaceholder: "Say more, if you like…",
  reminder: "What did it remind you of in your own life?",
  research: "Anything you want to look into further?",
  takeaway: "What's your takeaway?",
} as const;

export interface ReflectionDraft {
  feelings: string[];
  feelingNote: string;
  reminder: string;
  takeaway: string;
  action: string;
  research: string;
}

export const EMPTY_REFLECTION: ReflectionDraft = {
  action: "",
  feelingNote: "",
  feelings: [],
  reminder: "",
  research: "",
  takeaway: "",
};

const TEXT_FIELDS = [
  "feelingNote",
  "reminder",
  "takeaway",
  "action",
  "research",
] as const;

function cleanFeelings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const picked: string[] = [];
  for (const word of value) {
    const known = FEELINGS.find((f) => f === word);
    if (known && !picked.includes(known)) {
      picked.push(known);
    }
  }
  return picked.slice(0, MAX_FEELINGS);
}

/** True when there is something worth keeping: a feeling or any real text. */
export function hasReflection(d: ReflectionDraft): boolean {
  return (
    cleanFeelings(d.feelings).length > 0 ||
    TEXT_FIELDS.some((key) => d[key].trim() !== "")
  );
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Accepts an old draft ({ lessons, stirs, action }), a new-shape draft, or
 * junk, and always returns a valid ReflectionDraft.
 */
export function migrateDraft(old: unknown): ReflectionDraft {
  if (!old || typeof old !== "object" || Array.isArray(old)) {
    return { ...EMPTY_REFLECTION, feelings: [] };
  }
  const o = old as Record<string, unknown>;
  return {
    action: str(o.action),
    feelingNote: str(o.feelingNote),
    feelings: cleanFeelings(o.feelings),
    reminder: str(o.reminder) || str(o.stirs),
    research: str(o.research),
    takeaway: str(o.takeaway) || str(o.lessons),
  };
}

function feelingParagraph(d: ReflectionDraft): string {
  const words = cleanFeelings(d.feelings).join(", ");
  const note = d.feelingNote.trim();
  if (words && note) {
    return `${words}. ${note}`;
  }
  return words ? `${words}.` : note;
}

export function reflectionBody(d: ReflectionDraft): string {
  return formatTadabburBody({
    action: d.action,
    feeling: feelingParagraph(d),
    reminder: d.reminder,
    research: d.research,
    takeaway: d.takeaway,
  });
}
