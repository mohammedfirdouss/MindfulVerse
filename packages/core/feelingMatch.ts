// Matches a feeling typed in the reader's own words to the Check-in chips
// (apps/web/public/data/emotions.json). It runs on the device only: the text
// is never sent, stored or tracked; only a tapped chip's id is.
//
// The list is deliberately small and honest: a word is here only when its
// everyday meaning clearly fits the chip and the verses behind it. When
// nothing fits, the reader is asked to pick the nearest chip instead.

/** A chip id the typed words seem to point to, and the words that matched. */
export interface FeelingMatch {
  id: string;
  word: string;
}

/** Suggestions shown at most, best first. */
export const MAX_FEELING_MATCHES = 2;

/** Longest text the Check-in field accepts. */
export const FEELING_TEXT_MAX = 120;

/** Trimmed length from which "no close match" is worth saying. */
export const FEELING_TEXT_MIN = 3;

// People whose loss or absence points to grief: "miss my dad", "lost my mum".
const LOVED_ONES = [
  "mum",
  "mom",
  "mother",
  "dad",
  "father",
  "brother",
  "sister",
  "son",
  "daughter",
  "husband",
  "wife",
  "baby",
  "child",
  "grandma",
  "grandmother",
  "grandad",
  "grandpa",
  "grandfather",
  "nan",
  "uncle",
  "aunt",
] as const;

const lovedOnes = (lead: string): string[] =>
  LOVED_ONES.map((who) => `${lead} ${who}`);

/** Everyday words and phrases per emotion id. Entries are written in their
 *  base form where that reads naturally; light stemming covers -s, -ed and
 *  -ing, so "worry" also matches "worried" and "worrying". */
export const FEELING_WORDS: Readonly<Record<string, readonly string[]>> = {
  afraid: [
    "afraid",
    "scared",
    "scare",
    "fear",
    "fearful",
    "frightened",
    "terrified",
    "petrified",
    "dread",
    "dreading",
    "unsafe",
  ],
  angry: [
    "angry",
    "anger",
    "furious",
    "fuming",
    "livid",
    "rage",
    "raging",
    "mad at",
    "annoyed",
    "irritated",
    "frustrated",
    "resentful",
    "resentment",
    "bitter",
  ],
  anxious: [
    "anxious",
    "anxiety",
    "worry",
    "worried",
    "stress",
    "stressed",
    "stressful",
    "nervous",
    "panic",
    "panicking",
    "panicked",
    "panicky",
    "panic attack",
    "on edge",
    "tense",
    "uneasy",
    "overthinking",
    "freaking out",
    "apprehensive",
  ],
  grateful: [
    "grateful",
    "gratitude",
    "thankful",
    "thank god",
    "thank allah",
    "alhamdulillah",
    "blessed",
    "counting my blessings",
    "appreciative",
    "appreciate",
    "lucky",
  ],
  grieving: [
    "grieving",
    "grief",
    "grieve",
    "mourning",
    "mourn",
    "bereaved",
    "bereavement",
    "heartbroken",
    "broken heart",
    "heartbreak",
    "passed away",
    "funeral",
    ...lovedOnes("miss my"),
    ...lovedOnes("lost my"),
    // Missing a friend is as often distance as loss, so only "lost" counts.
    "lost my friend",
    "lost my best friend",
  ],
  hopeful: [
    "hopeful",
    "hope",
    "hoping",
    "optimistic",
    "looking forward",
    "fresh start",
    "new start",
    "better days",
    "things will get better",
  ],
  lonely: [
    "lonely",
    "loneliness",
    "alone",
    "isolated",
    "left out",
    "on my own",
    "by myself",
    "nobody understands",
    "no one understands",
    "nobody cares",
    "no one cares",
    "no friends",
    "unloved",
    "abandoned",
    "homesick",
    "invisible",
  ],
  overwhelmed: [
    "overwhelmed",
    "overwhelming",
    "too much",
    "so much to do",
    "drowning",
    "swamped",
    "overworked",
    "under pressure",
    "pressure",
    "cant cope",
    "cannot cope",
    "cant keep up",
    "falling apart",
  ],
  regretful: [
    "regret",
    "regretful",
    "guilty",
    "guilt",
    "ashamed",
    "shame",
    "remorse",
    "my fault",
    "messed up",
    "made a mistake",
    "mistake",
    "sinned",
    "wish i hadnt",
    "let everyone down",
  ],
  restless: [
    "restless",
    "cant sleep",
    "cannot sleep",
    "couldnt sleep",
    "sleepless",
    "insomnia",
    "unsettled",
    "agitated",
    "fidgety",
    "cant settle",
    "cant relax",
    "cant switch off",
    "mind racing",
    "racing thoughts",
    "no peace",
  ],
  "seeking-guidance": [
    "confused",
    "confused about",
    "lost",
    "unsure",
    "uncertain",
    "guidance",
    "guide me",
    "need advice",
    "dont know what to do",
    "what should i do",
    "which way",
    "torn between",
    "crossroads",
    "stuck",
    "decision",
  ],
  weary: [
    "weary",
    "tired",
    "tired of",
    "exhausted",
    "drained",
    "worn out",
    "burnt out",
    "burned out",
    "burnout",
    "fatigued",
    "no energy",
    "running on empty",
    "had enough",
    "fed up",
    "sick of",
  ],
};

// A match directly after one of these (or after "not feeling", "don't feel")
// is skipped: "not anxious" should not suggest Anxious.
const NEGATORS = new Set([
  "not",
  "no",
  "never",
  "isnt",
  "dont",
  "arent",
  "wasnt",
  "werent",
  "doesnt",
  "didnt",
  "aint",
]);
const NEGATION_BRIDGE = new Set(["feeling", "feel", "felt", "really", "that"]);

const APOSTROPHES = /['‘’ʼ`]/gu;
const NON_WORD = /[^a-z0-9]+/gu;

/** Lowercase words with punctuation stripped; "can't" becomes "cant". */
export function feelingTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(APOSTROPHES, "")
    .replaceAll(NON_WORD, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const MIN_STEM = 3;

/** The forms a typed word may stand for once -s, -ed or -ing is dropped. */
function wordForms(token: string): Set<string> {
  const forms = new Set([token]);
  const add = (form: string) => {
    if (form.length >= MIN_STEM) {
      forms.add(form);
    }
  };
  if (token.endsWith("ies") || token.endsWith("ied")) {
    add(`${token.slice(0, -3)}y`);
  }
  if (token.endsWith("es")) {
    add(token.slice(0, -2));
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    add(token.slice(0, -1));
  }
  if (token.endsWith("ed")) {
    const base = token.slice(0, -2);
    add(base);
    add(`${base}e`);
  }
  if (token.endsWith("ing")) {
    const base = token.slice(0, -3);
    add(base);
    add(`${base}e`);
  }
  return forms;
}

interface Entry {
  id: string;
  tokens: string[];
}

// Longest entries first, so "lost my dad" claims its words before "lost".
const ENTRIES: readonly Entry[] = Object.entries(FEELING_WORDS)
  .flatMap(([id, words]) =>
    words.map((word) => ({ id, tokens: feelingTokens(word) }))
  )
  // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array; toSorted is missing on older Hermes
  .sort((a, b) => b.tokens.length - a.tokens.length);

const PHRASE_SCORE = 3;
const WORD_SCORE = 2;

function isNegated(forms: Set<string>[], start: number): boolean {
  const before = forms[start - 1];
  if (!before) {
    return false;
  }
  if ([...before].some((f) => NEGATORS.has(f))) {
    return true;
  }
  const twoBefore = forms[start - 2];
  return (
    twoBefore !== undefined &&
    [...before].some((f) => NEGATION_BRIDGE.has(f)) &&
    [...twoBefore].some((f) => NEGATORS.has(f))
  );
}

function matchesAt(forms: Set<string>[], start: number, entry: Entry): boolean {
  return entry.tokens.every((t, i) => forms[start + i]?.has(t) === true);
}

interface Tally {
  id: string;
  score: number;
  first: number;
  word: string;
  wordScore: number;
}

/** The chips the typed words seem to point to, best first, at most two.
 *  Only ids in `ids` are returned. Phrases count more than single words and
 *  more hits rank higher; ties keep the earlier mention, then `ids` order. */
export function matchFeelings(
  text: string,
  ids: readonly string[]
): FeelingMatch[] {
  const typed = feelingTokens(text);
  const forms = typed.map(wordForms);
  const allowed = new Set(ids);
  const used = Array.from({ length: typed.length }, () => false);
  const tallies = new Map<string, Tally>();

  for (const entry of ENTRIES) {
    if (!allowed.has(entry.id)) {
      continue;
    }
    const span = entry.tokens.length;
    for (let start = 0; start + span <= typed.length; start += 1) {
      const free = used.slice(start, start + span).every((u) => !u);
      if (!free || !matchesAt(forms, start, entry)) {
        continue;
      }
      for (let i = start; i < start + span; i += 1) {
        used[i] = true;
      }
      if (isNegated(forms, start)) {
        continue;
      }
      const score = span > 1 ? PHRASE_SCORE : WORD_SCORE;
      const word = typed.slice(start, start + span).join(" ");
      const tally = tallies.get(entry.id);
      if (tally) {
        tally.score += score;
        tally.first = Math.min(tally.first, start);
        if (score > tally.wordScore) {
          tally.word = word;
          tally.wordScore = score;
        }
      } else {
        tallies.set(entry.id, {
          first: start,
          id: entry.id,
          score,
          word,
          wordScore: score,
        });
      }
    }
  }

  // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array; toSorted is missing on older Hermes
  return [...tallies.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.first - b.first ||
        ids.indexOf(a.id) - ids.indexOf(b.id)
    )
    .slice(0, MAX_FEELING_MATCHES)
    .map(({ id, word }) => ({ id, word }));
}
