# Reading Mode + Juz/Hizb Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a flowing, mushaf-style Reading mode to the reader and let people read by juz (with hizb jump points), using real boundary data from QUL.

**Architecture:** A build step emits `public/data/divisions.json` (juz/hizb/rub/sajdah boundaries). Pure helpers in `src/lib/divisions.ts` answer boundary questions. The existing surah reader is split into shared pieces — `Sheet`, commentary, `VerseBlock`, `ReadingText`, `VerseSheet`, `ReadingControls` — which a new `/read/juz/:n` page reuses. The Read index gains Surah | Juz tabs.

**Tech Stack:** React 18 + TypeScript + Vite, react-router-dom v6, Vitest (node environment, no DOM testing library), Playwright (screenshots only), plain CSS in `src/index.css`.

**Spec:** `docs/superpowers/specs/2026-09-23-reading-mode-juz-design.md` — read it first.

## Global Constraints

- Qur'an text and translation are shown **verbatim** from the bundled data. No paraphrase, no LLM text.
- Local-first: all data comes from `/public/data`; no network APIs.
- No new npm dependencies.
- Colours only via existing CSS tokens (`--indigo`, `--indigo-deep`, `--indigo-wash`, `--ink*`, `--line*`, `--surface*`); every new style must look right in light and `[data-theme="dark"]`.
- Arabic text uses `var(--font-arabic)` and colour `var(--indigo-deep)`, like `.arabic` in `src/index.css`.
- Commit messages: a single one-line subject (`type: sentence`), **no body, no Co-Authored-By or any Claude trailer**.
- Do **not** commit anything under `docs/superpowers/` (specs and plans stay local).
- Run `npx tsc -b` and `npm test` before every commit; both must pass.

## File Map

| File | Status | Responsibility |
|---|---|---|
| `scripts/build-data.mjs` | modify | emit `divisions.json` |
| `public/data/divisions.json` | generated | juz / hizb / rub / sajdah boundaries |
| `src/lib/types.ts` | modify | `Division`, `Divisions` types |
| `src/lib/data.ts` | modify | `loadDivisions()` |
| `src/lib/divisions.ts` | create | pure boundary helpers + verse id parsing |
| `src/lib/divisions.test.ts` | create | unit tests for helpers |
| `src/lib/divisions.data.test.ts` | create | sanity tests on the generated file |
| `src/components/Sheet.tsx` | create | bottom-sheet shell (focus, Esc, back button) |
| `src/components/Commentary.tsx` | create | tafsir lookup, labels, `useTafsir`, `CommentaryBody`, `CommentarySheet` |
| `src/lib/useShareFeedback.ts` | create | "Shared ✓ / Copied ✓" state for one share button |
| `src/components/VerseBlock.tsx` | create | one verse in Translation view |
| `src/lib/readingPrefs.ts` | create | size + view preferences (with old-value migration) |
| `src/components/ReadingControls.tsx` | create | size buttons + Translation/Reading toggle |
| `src/lib/useLastReadTracker.ts` | create | records the topmost visible verse as last read |
| `src/components/ReadingText.tsx` | create | flowing Arabic text |
| `src/components/VerseSheet.tsx` | create | sheet for a tapped verse in Reading mode |
| `src/pages/Surah.tsx` | modify | use the shared pieces; Translation/Reading |
| `src/pages/Juz.tsx` | create | `/read/juz/:n` |
| `src/App.tsx` | modify | juz route |
| `src/pages/Reader.tsx` | modify | Surah / Juz tabs |
| `src/pages/Stats.tsx`, `src/lib/analytics.ts` | modify | new view values |
| `src/index.css` | modify | reading styles |

---

### Task 1: Generate `divisions.json`

**Files:**
- Modify: `scripts/build-data.mjs` (inside `main()`, after the `search.json` block, before `// ---- Summary ----`)
- Modify: `src/lib/types.ts` (append)
- Create: `src/lib/divisions.data.test.ts`
- Generated: `public/data/divisions.json`

**Interfaces:**
- Produces: `public/data/divisions.json` shaped as `Divisions`; types `Division`, `Divisions` exported from `src/lib/types.ts`.

- [ ] **Step 1: Add the types** — append to `src/lib/types.ts`:

```ts
/** One juz or hizb: an inclusive verse-key range. */
export interface Division {
  n: number;
  first: string; // "2:142"
  last: string; // "2:252"
  /** Juz only: first three words of the first verse, verbatim. */
  opening?: string;
}

/** Mushaf divisions from QUL metadata (public/data/divisions.json). */
export interface Divisions {
  juz: Division[]; // 30
  hizb: Division[]; // 60
  rub: string[]; // 240 quarter start keys
  sajda: { key: string; type: string }[]; // 15
}
```

- [ ] **Step 2: Write the failing data test** — create `src/lib/divisions.data.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Divisions, SurahMeta } from "./types";

function read<T>(file: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../public/data/${file}`, import.meta.url), "utf8")
  ) as T;
}

const d = read<Divisions>("divisions.json");
const surahs = read<SurahMeta[]>("surahs.json");
const counts = new Map(surahs.map((s) => [s.number, s.ayahCount]));

/** The verse key right after `key`, or null after 114:6. */
function next(key: string): string | null {
  const [s, a] = key.split(":").map(Number);
  if (a < counts.get(s)!) return `${s}:${a + 1}`;
  return s < 114 ? `${s + 1}:1` : null;
}

describe("divisions.json", () => {
  it("has every division", () => {
    expect(d.juz).toHaveLength(30);
    expect(d.hizb).toHaveLength(60);
    expect(d.rub).toHaveLength(240);
    expect(d.sajda).toHaveLength(15);
  });

  it("juz ranges are contiguous and cover the whole Qur'an", () => {
    expect(d.juz[0].first).toBe("1:1");
    expect(d.juz[29].last).toBe("114:6");
    for (let i = 1; i < d.juz.length; i++) {
      expect(d.juz[i].first).toBe(next(d.juz[i - 1].last));
    }
    let total = 0;
    for (const j of d.juz) {
      for (let k: string | null = j.first; k; k = k === j.last ? null : next(k)) total++;
    }
    expect(total).toBe(6236);
  });

  it("hizb ranges are contiguous", () => {
    for (let i = 1; i < d.hizb.length; i++) {
      expect(d.hizb[i].first).toBe(next(d.hizb[i - 1].last));
    }
  });

  it("every juz carries its opening words", () => {
    for (const j of d.juz) expect(j.opening?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/lib/divisions.data.test.ts`
Expected: FAIL — `ENOENT ... divisions.json`.

- [ ] **Step 4: Emit the file** — in `scripts/build-data.mjs`, after the `search.json` block, add:

```js
  // ---- divisions.json ----
  // Juz / hizb / quarter / sajdah boundaries for juz reading and the inline
  // mushaf marks. `opening` is copied verbatim so the juz list needn't load
  // surah files just to label its rows.
  const metadata = (name) =>
    Object.values(
      readJSON(path.join(QUL, "Quran metadata", `quran-metadata-${name}.json`)),
    );
  const firstWords = (key, n = 3) => {
    const [s, a] = key.split(":").map(Number);
    const ayah = bySurah.get(s).find((x) => x.ayah === a);
    return ayah.arabic.split(/\s+/).slice(0, n).join(" ");
  };
  const byNumber = (field) => (x, y) => x[field] - y[field];
  const divisions = {
    juz: metadata("juz")
      .sort(byNumber("juz_number"))
      .map((j) => ({
        n: j.juz_number,
        first: j.first_verse_key,
        last: j.last_verse_key,
        opening: firstWords(j.first_verse_key),
      })),
    hizb: metadata("hizb")
      .sort(byNumber("hizb_number"))
      .map((h) => ({ n: h.hizb_number, first: h.first_verse_key, last: h.last_verse_key })),
    rub: metadata("rub")
      .sort(byNumber("rub_number"))
      .map((r) => r.first_verse_key),
    sajda: metadata("sajda")
      .sort(byNumber("sajdah_number"))
      .map((s) => ({ key: s.verse_key, type: s.sajdah_type })),
  };
  fs.writeFileSync(path.join(OUT, "divisions.json"), JSON.stringify(divisions));
```

and in the summary block add:

```js
  console.log(`divisions:             ${divisions.juz.length} juz, ${divisions.hizb.length} hizb, ${divisions.rub.length} rub, ${divisions.sajda.length} sajdah`);
```

- [ ] **Step 5: Regenerate and check nothing else changed**

Run: `npm run build:data && git status --short public/data`
Expected: summary prints `divisions: 30 juz, 60 hizb, 240 rub, 15 sajdah`; `git status` shows **only** `?? public/data/divisions.json`. If any other data file shows as modified, stop and report — the build is not deterministic and that must be understood first.

- [ ] **Step 6: Run the test**

Run: `npx vitest run src/lib/divisions.data.test.ts`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-data.mjs src/lib/types.ts src/lib/divisions.data.test.ts public/data/divisions.json
git commit -m "feat: generate juz, hizb, quarter and sajdah boundaries"
```

---

### Task 2: Boundary helpers

**Files:**
- Create: `src/lib/divisions.ts`, `src/lib/divisions.test.ts`
- Modify: `src/lib/data.ts` (add loader)

**Interfaces:**
- Consumes: `Divisions`, `Division` from `./types`.
- Produces (all exported from `src/lib/divisions.ts`):
  - `compareKeys(a: string, b: string): number`
  - `juzOf(key: string, d: Divisions): number | null`
  - `hizbOf(key: string, d: Divisions): number | null`
  - `interface Span { surah: number; from: number; to: number }`
  - `spansInRange(first: string, last: string, ayahCounts: Map<number, number>): Span[]`
  - `interface Marks { rub: Set<string>; sajda: Map<string, string> }`
  - `makeMarks(d: Divisions): Marks` — `rub` excludes `"1:1"`
  - `toArabicDigits(n: number): string`
  - `parseVerseId(id: string): { surah: number | null; ayah: number } | null` — `"v12"` → `{surah:null, ayah:12}`, `"v2-255"` → `{surah:2, ayah:255}`
  - `verseId(surah: number, ayah: number): string` → `"v2-255"`
- Produces in `src/lib/data.ts`: `loadDivisions(): Promise<Divisions>`

- [ ] **Step 1: Write the failing tests** — create `src/lib/divisions.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareKeys,
  hizbOf,
  juzOf,
  makeMarks,
  parseVerseId,
  spansInRange,
  toArabicDigits,
  verseId,
} from "./divisions";
import type { Divisions, SurahMeta } from "./types";

function read<T>(file: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../public/data/${file}`, import.meta.url), "utf8")
  ) as T;
}
const d = read<Divisions>("divisions.json");
const counts = new Map(read<SurahMeta[]>("surahs.json").map((s) => [s.number, s.ayahCount]));

describe("compareKeys", () => {
  it("orders numerically, not lexically", () => {
    expect(compareKeys("2:141", "2:142")).toBeLessThan(0);
    expect(compareKeys("9:1", "10:1")).toBeLessThan(0);
    expect(compareKeys("2:9", "2:10")).toBeLessThan(0);
    expect(compareKeys("3:1", "3:1")).toBe(0);
  });
});

describe("juzOf / hizbOf", () => {
  it("finds the division at its boundaries", () => {
    expect(juzOf("1:7", d)).toBe(1);
    expect(juzOf("2:141", d)).toBe(1);
    expect(juzOf("2:142", d)).toBe(2);
    expect(juzOf("114:6", d)).toBe(30);
    expect(hizbOf("2:74", d)).toBe(1);
    expect(hizbOf("2:75", d)).toBe(2);
  });
  it("returns null for a key outside the Qur'an", () => {
    expect(juzOf("115:1", d)).toBeNull();
  });
});

describe("spansInRange", () => {
  it("splits juz 1 into Al-Fatihah and part of Al-Baqarah", () => {
    expect(spansInRange("1:1", "2:141", counts)).toEqual([
      { surah: 1, from: 1, to: 7 },
      { surah: 2, from: 1, to: 141 },
    ]);
  });
  it("covers the 37 surahs of juz 30", () => {
    const spans = spansInRange("78:1", "114:6", counts);
    expect(spans).toHaveLength(37);
    expect(spans[0]).toEqual({ surah: 78, from: 1, to: 40 });
    expect(spans[36]).toEqual({ surah: 114, from: 1, to: 6 });
  });
  it("handles a range inside one surah", () => {
    expect(spansInRange("2:142", "2:252", counts)).toEqual([{ surah: 2, from: 142, to: 252 }]);
  });
});

describe("makeMarks", () => {
  it("marks quarter starts except the very first verse", () => {
    const m = makeMarks(d);
    expect(m.rub.has("1:1")).toBe(false);
    expect(m.rub.has(d.rub[1])).toBe(true);
    expect(m.rub.size).toBe(239);
  });
  it("marks sajdah verses with their type", () => {
    expect(makeMarks(d).sajda.get("7:206")).toBe("optional");
  });
});

describe("verse ids", () => {
  it("round-trips surah-qualified ids", () => {
    expect(verseId(2, 255)).toBe("v2-255");
    expect(parseVerseId("v2-255")).toEqual({ surah: 2, ayah: 255 });
  });
  it("reads the surah page's plain ids", () => {
    expect(parseVerseId("v12")).toEqual({ surah: null, ayah: 12 });
  });
  it("rejects anything else", () => {
    expect(parseVerseId("verse")).toBeNull();
  });
});

describe("toArabicDigits", () => {
  it("converts to Arabic-Indic digits", () => {
    expect(toArabicDigits(286)).toBe("٢٨٦");
    expect(toArabicDigits(10)).toBe("١٠");
  });
});
```

Note: juz 30 spans surahs 78–114, which is 37 surahs (114 − 78 + 1).

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/lib/divisions.test.ts`
Expected: FAIL — cannot resolve `./divisions`.

- [ ] **Step 3: Implement** — create `src/lib/divisions.ts`:

```ts
// Mushaf divisions (juz, hizb, quarters, sajdah) — pure helpers over the data
// in public/data/divisions.json. Verse keys are "surah:ayah".
import type { Division, Divisions } from "./types";

function split(key: string): [number, number] {
  const [s, a] = key.split(":").map(Number);
  return [s, a];
}

export function compareKeys(a: string, b: string): number {
  const [as, aa] = split(a);
  const [bs, ba] = split(b);
  return as - bs || aa - ba;
}

function divisionOf(list: Division[], key: string): number | null {
  const hit = list.find(
    (x) => compareKeys(key, x.first) >= 0 && compareKeys(key, x.last) <= 0
  );
  return hit ? hit.n : null;
}

export const juzOf = (key: string, d: Divisions) => divisionOf(d.juz, key);
export const hizbOf = (key: string, d: Divisions) => divisionOf(d.hizb, key);

export interface Span {
  surah: number;
  from: number;
  to: number;
}

/** The per-surah slices an inclusive key range covers, in reading order. */
export function spansInRange(
  first: string,
  last: string,
  ayahCounts: Map<number, number>
): Span[] {
  const [fs, fa] = split(first);
  const [ls, la] = split(last);
  const spans: Span[] = [];
  for (let s = fs; s <= ls; s++) {
    const count = ayahCounts.get(s);
    if (!count) continue;
    spans.push({ surah: s, from: s === fs ? fa : 1, to: s === ls ? la : count });
  }
  return spans;
}

export interface Marks {
  rub: Set<string>;
  sajda: Map<string, string>;
}

/** Inline mushaf marks. 1:1 opens the mushaf, so it carries no quarter sign. */
export function makeMarks(d: Divisions): Marks {
  return {
    rub: new Set(d.rub.filter((k) => k !== "1:1")),
    sajda: new Map(d.sajda.map((s) => [s.key, s.type])),
  };
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (c) => ARABIC_DIGITS[Number(c)]);
}

/** DOM id for a verse where two surahs can share a page (juz, reading text). */
export function verseId(surah: number, ayah: number): string {
  return `v${surah}-${ayah}`;
}

/** Reads both "v{ayah}" (surah page translation blocks) and "v{surah}-{ayah}". */
export function parseVerseId(id: string): { surah: number | null; ayah: number } | null {
  const m = /^v(?:(\d+)-)?(\d+)$/.exec(id);
  if (!m) return null;
  return { surah: m[1] ? Number(m[1]) : null, ayah: Number(m[2]) };
}
```

- [ ] **Step 4: Add the loader** — in `src/lib/data.ts`, add `Divisions` to the `import type { ... } from "./types"` list and add below `loadEmotions`:

```ts
/** Juz / hizb / quarter / sajdah boundaries (a few KB). */
export const loadDivisions = () => getJson<Divisions>("/data/divisions.json");
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/divisions.test.ts && npx tsc -b`
Expected: all pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/divisions.ts src/lib/divisions.test.ts src/lib/data.ts
git commit -m "feat: add juz, hizb and verse id helpers"
```

---

### Task 3: Extract the sheet and commentary (no behaviour change)

**Files:**
- Create: `src/components/Sheet.tsx`, `src/components/Commentary.tsx`
- Modify: `src/pages/Surah.tsx` — delete `coveringFromIndex` (lines 30–40) and `CommentarySheet` (lines 42–162), replace the tafsir state/logic

**Interfaces:**
- Produces from `src/components/Sheet.tsx`: default export `Sheet(props: { label: string; title: ReactNode; onClose: () => void; children: ReactNode })`.
- Produces from `src/components/Commentary.tsx`:
  - `type TafsirIndex = Record<string, number[]>`
  - `coveringFor(index: TafsirIndex | null, a: Ayah): number | null`
  - `commentaryLabel(index: TafsirIndex | null, a: Ayah): string`
  - `commentaryTitle(a: Ayah, source: number): string`
  - `useTafsir(): { request(surah: number): void; textFor(a: Ayah, source: number): string | null; failedFor(surah: number): boolean }`
  - `CommentaryBody(props: { ayah: Ayah; text: string | null; failed: boolean })`
  - `CommentarySheet(props: { ayah: Ayah; index: TafsirIndex | null; tafsir: Tafsir; onClose: () => void })` where `type Tafsir = ReturnType<typeof useTafsir>` (exported)

- [ ] **Step 1: Create `src/components/Sheet.tsx`** — the shell moved verbatim from `CommentarySheet` in `Surah.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet: focus moves in and back out, Escape and the phone's back
 *  gesture close it, and the page behind stops scrolling while it's open. */
export default function Sheet({
  label,
  title,
  onClose,
  children,
}: {
  label: string;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog, and hand it back to the opener on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prevFocus?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // The phone's back button/gesture must close the sheet, not leave the page.
  useEffect(() => {
    const onPop = () => onClose();
    window.history.pushState({ mvSheet: true }, "");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed via ✕/backdrop/Escape: remove the extra history entry we added.
      if (window.history.state?.mvSheet) window.history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grip" />
        {/* Compact fixed header — label + close only, so the ✕ is always
            visible and tappable; long content scrolls in the body. */}
        <div className="sheet-head" style={{ alignItems: "center" }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {title}
          </p>
          <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Create `src/components/Commentary.tsx`**:

```tsx
import { useCallback, useEffect, useState } from "react";
import { loadSurahTafsir } from "../lib/data";
import type { Ayah, SurahTafsir } from "../lib/types";
import Sheet from "./Sheet";

/** Per-surah list of ayahs that carry a direct Ibn Kathir entry. */
export type TafsirIndex = Record<string, number[]>;

/** Ibn Kathir comments on passages: a run of ayahs stores its commentary under
 *  the first ayah of the group. Find the entry covering this ayah. */
export function coveringFor(index: TafsirIndex | null, a: Ayah): number | null {
  if (!index) return null;
  let best: number | null = null;
  for (const n of index[String(a.surah)] ?? []) {
    if (n <= a.ayah) best = n;
    else break;
  }
  return best;
}

export function commentaryLabel(index: TafsirIndex | null, a: Ayah): string {
  if (!index) return "Commentary isn’t available right now";
  const c = coveringFor(index, a);
  if (c === null) return "No commentary for this verse";
  return c === a.ayah ? "Read the commentary" : `Read the commentary (with verse ${c})`;
}

export function commentaryTitle(a: Ayah, source: number): string {
  return source === a.ayah
    ? `Ibn Kathir · ${a.surah}:${a.ayah}`
    : `Ibn Kathir · on the passage from ${a.surah}:${source}`;
}

/** Loads each surah's tafsir on first request, keyed by surah so a page that
 *  spans surahs (a juz) never shows one surah's commentary on another's verse. */
export function useTafsir() {
  const [bySurah, setBySurah] = useState<Record<number, SurahTafsir>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const request = useCallback((surah: number) => {
    setFailed((f) => ({ ...f, [surah]: false }));
    loadSurahTafsir(surah)
      .then((t) => setBySurah((b) => ({ ...b, [surah]: t })))
      .catch(() => setFailed((f) => ({ ...f, [surah]: true })));
  }, []);

  function textFor(a: Ayah, source: number): string | null {
    const t = bySurah[a.surah];
    return t ? (t[String(source)] ?? "") : null;
  }

  function failedFor(surah: number): boolean {
    return !!failed[surah] && !bySurah[surah];
  }

  return { request, textFor, failedFor };
}

export type Tafsir = ReturnType<typeof useTafsir>;

export function CommentaryBody({
  ayah,
  text,
  failed,
}: {
  ayah: Ayah;
  /** null while the tafsir file is still downloading. */
  text: string | null;
  failed: boolean;
}) {
  const paragraphs = (text ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      <p
        className="arabic"
        lang="ar"
        style={{
          fontSize: "1.4rem",
          lineHeight: 1.9,
          margin: "0 0 14px",
          paddingBottom: 14,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {ayah.arabic}
      </p>
      {failed ? (
        <p className="muted">
          The commentary isn’t available offline yet. Try again when you’re connected.
        </p>
      ) : text === null ? (
        <p className="muted">Opening the commentary…</p>
      ) : (
        <div className="tafsir">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 14 }}>
            Verse quotations inside the commentary follow its classical English edition,
            which differs from the ClearQuran translation shown in the reader.
          </p>
        </div>
      )}
    </>
  );
}

export function CommentarySheet({
  ayah,
  index,
  tafsir,
  onClose,
}: {
  ayah: Ayah;
  index: TafsirIndex | null;
  tafsir: Tafsir;
  onClose: () => void;
}) {
  const covering = coveringFor(index, ayah);
  const { request } = tafsir;
  useEffect(() => {
    request(ayah.surah);
  }, [request, ayah.surah]);
  if (covering === null) return null;
  return (
    <Sheet
      label={`Commentary on verse ${ayah.verseKey}`}
      title={commentaryTitle(ayah, covering)}
      onClose={onClose}
    >
      <CommentaryBody
        ayah={ayah}
        text={tafsir.textFor(ayah, covering)}
        failed={tafsir.failedFor(ayah.surah)}
      />
    </Sheet>
  );
}
```

- [ ] **Step 3: Rewire `Surah.tsx`**
  1. Delete `coveringFromIndex` and the whole `CommentarySheet` function.
  2. Remove `loadSurahTafsir` from the `../lib/data` import and `SurahTafsir` from the types import; add
     `import { CommentarySheet, coveringFor, commentaryLabel, useTafsir, type TafsirIndex } from "../components/Commentary";`
  3. Replace the state lines `indexed`, `indexFailed`, `tafsir`, `tafsirFailed`, `tafsirPromise` with:
     ```ts
     const [index, setIndex] = useState<TafsirIndex | null>(null);
     const tafsir = useTafsir();
     ```
  4. In the load effect: delete `setTafsir(null); tafsirPromise.current = null;`, and replace `setIndexed(...)` / `setIndexFailed(...)` with `setIndex(indexData);`.
  5. Delete `ensureTafsir` and `openCommentary`; the commentary button's `onClick` becomes `() => setOpenAyah(a)`.
  6. Delete `openCovering` / `openText`. In the verse map, replace `const covering = coveringFromIndex(indexed, a.ayah); const direct = covering === a.ayah;` with `const covering = coveringFor(index, a);` and the button's label expression with `{commentaryLabel(index, a)}`.
  7. Replace the sheet at the bottom with:
     ```tsx
     {openAyah && (
       <CommentarySheet
         ayah={openAyah}
         index={index}
         tafsir={tafsir}
         onClose={() => setOpenAyah(null)}
       />
     )}
     ```

- [ ] **Step 4: Verify**

Run: `npx tsc -b && npm test`
Expected: clean, all tests pass.
Then `npx vite --port 5199` and in a browser open `http://localhost:5199/read/2`: tap "Read the commentary" on verse 1 → sheet opens with Ibn Kathir text; Escape closes it; browser Back closes it without leaving the page. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sheet.tsx src/components/Commentary.tsx src/pages/Surah.tsx
git commit -m "refactor: extract the bottom sheet and commentary from the reader"
```

---

### Task 4: Extract the Translation verse block and share feedback

**Files:**
- Create: `src/lib/useShareFeedback.ts`, `src/components/VerseBlock.tsx`
- Modify: `src/pages/Surah.tsx`

**Interfaces:**
- Consumes: `coveringFor`, `commentaryLabel`, `TafsirIndex` (Task 3).
- Produces:
  - `useShareFeedback(where: string): { label: string | null; share(a: Ayah): Promise<void> }`
  - `VerseBlock(props: { ayah: Ayah; id: string; index: TafsirIndex | null; onCommentary(a: Ayah): void; flash?: boolean })` — default export

- [ ] **Step 1: Create `src/lib/useShareFeedback.ts`**:

```ts
import { useEffect, useRef, useState } from "react";
import { shareVerse } from "./share";
import type { Ayah } from "./types";

/** One share button's confirmation: "Shared ✓" / "Copied ✓" for two seconds,
 *  nothing when the share sheet is dismissed or fails. */
export function useShareFeedback(where: string) {
  const [label, setLabel] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share(a: Ayah) {
    const result = await shareVerse(a, where);
    if (result === "cancelled" || result === "failed") return;
    window.clearTimeout(timer.current);
    setLabel(result === "copied" ? "Copied ✓" : "Shared ✓");
    timer.current = window.setTimeout(() => setLabel(null), 2000);
  }

  return { label, share };
}
```

- [ ] **Step 2: Create `src/components/VerseBlock.tsx`** (markup moved from the `ayahs.map` in `Surah.tsx`; translation is always shown — "Arabic only" is replaced by Reading mode in Task 5):

```tsx
import type { Ayah } from "../lib/types";
import { useShareFeedback } from "../lib/useShareFeedback";
import { commentaryLabel, coveringFor, type TafsirIndex } from "./Commentary";

export default function VerseBlock({
  ayah,
  id,
  index,
  onCommentary,
  flash = false,
}: {
  ayah: Ayah;
  id: string;
  index: TafsirIndex | null;
  onCommentary: (a: Ayah) => void;
  /** Briefly highlighted after a deep link lands here. */
  flash?: boolean;
}) {
  const share = useShareFeedback("reader");
  const covering = coveringFor(index, ayah);
  return (
    <article id={id} className={flash ? "verse flash" : "verse"} style={{ scrollMarginTop: 16 }}>
      <div className="verse-head">
        <span className="roundel">{ayah.ayah}</span>
        <span className="rule" />
      </div>
      <p className="arabic" lang="ar">
        {ayah.arabic}
      </p>
      <p className="translation">{ayah.translation}</p>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="commentary-open"
          disabled={covering === null}
          onClick={() => onCommentary(ayah)}
        >
          {commentaryLabel(index, ayah)}
        </button>
        <button className="commentary-open" onClick={() => void share.share(ayah)}>
          {share.label ?? "Share"}
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Use it in `Surah.tsx`**
  1. Import `VerseBlock` and delete the `shareVerse` import, the `shared` / `sharedTimer` state, the `useEffect(() => () => window.clearTimeout(sharedTimer.current), [])` line and the `share()` function.
  2. Replace the whole `ayahs.map((a) => { ... })` body with:
     ```tsx
     {ayahs.map((a) => (
       <VerseBlock
         key={a.verseKey}
         ayah={a}
         id={`v${a.ayah}`}
         index={index}
         onCommentary={setOpenAyah}
       />
     ))}
     ```
  3. Remove any imports that are now unused (`tsc -b` will name them).

  Temporary behaviour change, accepted: the "Arabic" view button still exists but now shows translation too; Task 5 replaces that toggle.

- [ ] **Step 4: Add the flash style** — append to `src/index.css`:

```css
/* A deep-linked verse glows briefly so the eye finds where it landed. */
.verse.flash { background: var(--indigo-wash); transition: background 1.2s ease; }
```

- [ ] **Step 5: Verify**

Run: `npx tsc -b && npm test`
Expected: clean. In the dev server, `/read/2`: Share on a verse shows "Copied ✓" (desktop) and reverts after 2s; commentary still opens.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useShareFeedback.ts src/components/VerseBlock.tsx src/pages/Surah.tsx src/index.css
git commit -m "refactor: extract the translation verse block from the reader"
```

---

### Task 5: Reading mode on the surah page

**Files:**
- Create: `src/lib/readingPrefs.ts`, `src/components/ReadingControls.tsx`, `src/lib/useLastReadTracker.ts`, `src/components/ReadingText.tsx`, `src/components/VerseSheet.tsx`
- Modify: `src/pages/Surah.tsx`, `src/lib/analytics.ts:20`, `src/pages/Stats.tsx` (lines 13, 130–135, 298), `src/index.css`

**Interfaces:**
- Consumes: `Marks`, `makeMarks`, `toArabicDigits`, `verseId`, `parseVerseId` (Task 2); `loadDivisions` (Task 2); `Sheet`, `CommentaryBody`, `commentaryTitle`, `commentaryLabel`, `coveringFor`, `Tafsir`, `TafsirIndex` (Task 3); `useShareFeedback` (Task 4).
- Produces:
  - `readingPrefs.ts`: `type ReadView = "translation" | "reading"`, `SIZES`, `getReadView(): ReadView`, `saveReadView(v: ReadView): void`, `getSizeKey(): string`, `saveSizeKey(k: string): void`, `scaleFor(k: string): number`
  - `ReadingControls(props: { sizeKey: string; onSize(k: string): void; view: ReadView; onView(v: ReadView): void })`
  - `useLastReadTracker(enabled: boolean, fallbackSurah: number | null, resetKey: unknown): void`
  - `ReadingText(props: { ayahs: Ayah[]; marks: Marks | null; surahNames: Map<number, string>; headings: boolean; activeKey: string | null; onSelect(a: Ayah): void })`
  - `VerseSheet(props: { ayah: Ayah; index: TafsirIndex | null; tafsir: Tafsir; onClose(): void })`

- [ ] **Step 1: Create `src/lib/readingPrefs.ts`**:

```ts
// Reader preferences shared by the surah and juz pages.
import { track } from "./analytics";

export type ReadView = "translation" | "reading";

export const SIZES: { key: string; label: string; scale: number }[] = [
  { key: "s", label: "A", scale: 0.86 },
  { key: "m", label: "A", scale: 1 },
  { key: "l", label: "A", scale: 1.22 },
];

const SIZE_KEY = "mindfulverse.readScale.v1";
const VIEW_KEY = "mindfulverse.readView.v1";

/** "arabic" (the old Arabic-only view) now opens Reading; "both" is Translation. */
export function getReadView(): ReadView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "reading" || v === "arabic" ? "reading" : "translation";
  } catch {
    return "translation";
  }
}

export function saveReadView(v: ReadView): void {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* storage unavailable — the choice lasts this visit */
  }
  track({ type: "read_view", view: v });
}

export function getSizeKey(): string {
  try {
    return localStorage.getItem(SIZE_KEY) ?? "m";
  } catch {
    return "m";
  }
}

export function saveSizeKey(k: string): void {
  try {
    localStorage.setItem(SIZE_KEY, k);
  } catch {
    /* ignore */
  }
}

export function scaleFor(k: string): number {
  return SIZES.find((s) => s.key === k)?.scale ?? 1;
}
```

- [ ] **Step 2: Update analytics and Stats**
  - `src/lib/analytics.ts:20` → `| { type: "read_view"; view: "translation" | "reading" }`
  - `src/pages/Stats.tsx`: delete `const READ_VIEW_KEY = ...` (line 13); import `getReadView` from `../lib/readingPrefs`; replace the `readView:` expression (lines 132–135) with
    `readView: getReadView() === "reading" ? "Reading" : "Translation",`
    and at line 298 replace the `value={...}` with `value={stats.readView}`.

- [ ] **Step 3: Create `src/components/ReadingControls.tsx`** (moved from the controls block in `Surah.tsx`):

```tsx
import { SIZES, type ReadView } from "../lib/readingPrefs";

export default function ReadingControls({
  sizeKey,
  onSize,
  view,
  onView,
}: {
  sizeKey: string;
  onSize: (k: string) => void;
  view: ReadView;
  onView: (v: ReadView) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div className="reading-controls" role="group" aria-label="Reading size">
        {SIZES.map((s, i) => (
          <button
            key={s.key}
            className="size-btn"
            aria-pressed={s.key === sizeKey}
            onClick={() => onSize(s.key)}
            style={{ fontSize: `${0.78 + i * 0.16}rem` }}
            aria-label={`Reading size ${s.key === "s" ? "small" : s.key === "m" ? "medium" : "large"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="reading-controls" role="group" aria-label="Reading view">
        <button
          className="size-btn"
          aria-pressed={view === "translation"}
          onClick={() => onView("translation")}
        >
          Translation
        </button>
        <button
          className="size-btn"
          aria-pressed={view === "reading"}
          onClick={() => onView("reading")}
        >
          Reading
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/lib/useLastReadTracker.ts`** (generalises the observer in `Surah.tsx` lines 249–275):

```ts
import { useEffect } from "react";
import { parseVerseId } from "./divisions";
import { recordLastRead } from "./progress";

/** The topmost visible verse becomes "last read". Watches both translation
 *  blocks (article.verse) and reading spans (.rv). `fallbackSurah` names the
 *  surah for plain "v{ayah}" ids; `resetKey` re-attaches after the view swaps. */
export function useLastReadTracker(
  enabled: boolean,
  fallbackSurah: number | null,
  resetKey: unknown
): void {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const visible = new Map<string, { surah: number; ayah: number }>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = parseVerseId(e.target.id);
          const surah = v?.surah ?? fallbackSurah;
          if (!v || surah === null) continue;
          const key = `${surah}:${v.ayah}`;
          if (e.isIntersecting) visible.set(key, { surah, ayah: v.ayah });
          else visible.delete(key);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const first = [...visible.values()].sort(
            (a, b) => a.surah - b.surah || a.ayah - b.ayah
          )[0];
          if (first) recordLastRead(first.surah, first.ayah);
        }, 800);
      },
      { rootMargin: "0px 0px -60% 0px" }
    );
    document.querySelectorAll("article.verse, .rv").forEach((el) => observer.observe(el));
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [enabled, fallbackSurah, resetKey]);
}
```

- [ ] **Step 5: Create `src/components/ReadingText.tsx`**:

```tsx
import { Fragment } from "react";
import { toArabicDigits, verseId, type Marks } from "../lib/divisions";
import type { Ayah } from "../lib/types";

/** Every surah except Al-Fatihah (where it is ayah 1) and At-Tawbah opens
 *  with the basmalah in the mushaf. */
const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Flowing, mushaf-style Arabic: verses run on as one justified passage, each
 *  closed by its numbered end-of-ayah mark. Tapping a verse selects it. */
export default function ReadingText({
  ayahs,
  marks,
  surahNames,
  headings,
  activeKey,
  onSelect,
}: {
  ayahs: Ayah[];
  marks: Marks | null;
  surahNames: Map<number, string>;
  /** Name each surah section (juz pages); the surah page has its own title. */
  headings: boolean;
  activeKey: string | null;
  onSelect: (a: Ayah) => void;
}) {
  const groups: { surah: number; ayahs: Ayah[] }[] = [];
  for (const a of ayahs) {
    const g = groups[groups.length - 1];
    if (g && g.surah === a.surah) g.ayahs.push(a);
    else groups.push({ surah: a.surah, ayahs: [a] });
  }

  return (
    <div className="reading">
      {groups.map((g) => {
        const from = g.ayahs[0].ayah;
        return (
          <section key={g.surah} className="reading-surah">
            {headings && (
              <h2 className="reading-surah-name">
                {surahNames.get(g.surah) ?? `Surah ${g.surah}`}
                {from > 1 && <span className="muted"> · from verse {from}</span>}
              </h2>
            )}
            {from === 1 && g.surah !== 1 && g.surah !== 9 && (
              <p className="reading-basmalah" lang="ar" dir="rtl">
                {BASMALAH}
              </p>
            )}
            <p className="reading-text" lang="ar" dir="rtl">
              {g.ayahs.map((a) => (
                <Fragment key={a.verseKey}>
                  {marks?.rub.has(a.verseKey) && (
                    <span className="reading-rub" aria-hidden="true">
                      ۞{" "}
                    </span>
                  )}
                  <span
                    id={verseId(a.surah, a.ayah)}
                    className={a.verseKey === activeKey ? "rv active" : "rv"}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(a)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(a);
                      }
                    }}
                  >
                    {a.arabic}
                    {marks?.sajda.has(a.verseKey) && " ۩"}{" "}
                    <span className="ayah-end">{toArabicDigits(a.ayah)}</span>
                  </span>{" "}
                </Fragment>
              ))}
            </p>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/VerseSheet.tsx`**:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Ayah } from "../lib/types";
import { useShareFeedback } from "../lib/useShareFeedback";
import {
  CommentaryBody,
  commentaryLabel,
  commentaryTitle,
  coveringFor,
  type Tafsir,
  type TafsirIndex,
} from "./Commentary";
import Sheet from "./Sheet";

/** A verse tapped in Reading mode: its translation and what you can do with it.
 *  Commentary opens inside the same sheet, so there is one history entry. */
export default function VerseSheet({
  ayah,
  index,
  tafsir,
  onClose,
}: {
  ayah: Ayah;
  index: TafsirIndex | null;
  tafsir: Tafsir;
  onClose: () => void;
}) {
  const [showCommentary, setShowCommentary] = useState(false);
  const share = useShareFeedback("reader");
  const covering = coveringFor(index, ayah);

  function openCommentary() {
    if (covering === null) return;
    tafsir.request(ayah.surah);
    setShowCommentary(true);
  }

  const inCommentary = showCommentary && covering !== null;
  return (
    <Sheet
      label={`Verse ${ayah.verseKey}`}
      title={inCommentary ? commentaryTitle(ayah, covering) : `Verse ${ayah.verseKey}`}
      onClose={onClose}
    >
      {inCommentary ? (
        <>
          <button
            className="link-btn"
            style={{ marginBottom: 14 }}
            onClick={() => setShowCommentary(false)}
          >
            ← Back to the verse
          </button>
          <CommentaryBody
            ayah={ayah}
            text={tafsir.textFor(ayah, covering)}
            failed={tafsir.failedFor(ayah.surah)}
          />
        </>
      ) : (
        <>
          <p className="arabic" lang="ar" style={{ fontSize: "1.5rem", lineHeight: 2, margin: "0 0 12px" }}>
            {ayah.arabic}
          </p>
          <p className="translation" style={{ margin: "0 0 6px" }}>
            {ayah.translation}
          </p>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <button className="commentary-open" disabled={covering === null} onClick={openCommentary}>
              {commentaryLabel(index, ayah)}
            </button>
            <button className="commentary-open" onClick={() => void share.share(ayah)}>
              {share.label ?? "Share"}
            </button>
            <Link className="commentary-open" to={`/tadabbur/${ayah.surah}?v=${ayah.ayah}`}>
              Reflect on this verse
            </Link>
          </div>
        </>
      )}
    </Sheet>
  );
}
```

- [ ] **Step 7: Reading styles** — append to `src/index.css`:

```css
/* --- Reading mode: flowing mushaf-style text --- */
.reading { color: var(--indigo-deep); padding-top: 8px; }
.reading-surah + .reading-surah { margin-top: 30px; }
.reading-surah-name {
  font-family: var(--font-read); font-size: 1.1rem; font-weight: 600;
  text-align: center; color: var(--indigo);
  margin: 14px 0 8px; padding-block: 10px;
  border-block: 1px solid var(--line);
}
.reading-basmalah {
  font-family: var(--font-arabic); text-align: center;
  font-size: calc(1.7rem * var(--read-scale, 1)); line-height: 2.2; margin: 6px 0 4px;
}
.reading-text {
  font-family: var(--font-arabic);
  font-size: calc(1.9rem * var(--read-scale, 1)); line-height: 2.5;
  text-align: justify; text-align-last: start; margin: 0;
}
.rv {
  cursor: pointer; border-radius: 4px; scroll-margin-top: 24px;
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
  transition: background .15s ease;
}
.rv:hover, .rv:focus-visible { background: var(--indigo-wash); outline: none; }
.rv.active { background: var(--indigo-wash); }
.ayah-end { color: var(--indigo); white-space: nowrap; }
.reading-rub { color: var(--indigo); }
```

- [ ] **Step 8: Wire Reading mode into `Surah.tsx`**
  1. Delete the local `BASMALAH`, `SIZES`, `SIZE_KEY`, `VIEW_KEY`, `type ReadView` declarations, and the size/view state, `chooseSize`, `chooseView`, the IntersectionObserver effect (the "Track reading position" block) and the `const scale = ...` line.
  2. Add imports:
     ```ts
     import ReadingControls from "../components/ReadingControls";
     import ReadingText from "../components/ReadingText";
     import VerseSheet from "../components/VerseSheet";
     import { loadDivisions } from "../lib/data";   // merge into the existing data import
     import { makeMarks, verseId, type Marks } from "../lib/divisions";
     import { getReadView, getSizeKey, saveReadView, saveSizeKey, scaleFor, type ReadView } from "../lib/readingPrefs";
     import { useLastReadTracker } from "../lib/useLastReadTracker";
     ```
  3. New state:
     ```ts
     const [view, setView] = useState<ReadView>(getReadView);
     const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
     const [marks, setMarks] = useState<Marks | null>(null);
     const [selected, setSelected] = useState<Ayah | null>(null);
     const [flashKey, setFlashKey] = useState<string | null>(null);
     ```
  4. In the load effect's `Promise.all`, add a fourth entry `loadDivisions().catch(() => null)` and in `.then` destructure it as `divisions` and call `setMarks(divisions ? makeMarks(divisions) : null);`.
  5. Replace the deep-link effect with:
     ```ts
     // Deep link (?v=n): scroll there once the surah renders, in either view.
     useEffect(() => {
       if (status !== "ready") return;
       const v = Number(params.get("v"));
       if (!Number.isFinite(v) || v < 1) return;
       const el = document.getElementById(view === "reading" ? verseId(surahNumber, v) : `v${v}`);
       if (!el) return;
       el.scrollIntoView({ block: "start" });
       recordLastRead(surahNumber, v);
       setFlashKey(`${surahNumber}:${v}`);
       const t = window.setTimeout(() => setFlashKey(null), 1600);
       return () => window.clearTimeout(t);
     }, [status, params, surahNumber, view]);

     useLastReadTracker(status === "ready", surahNumber, view);
     ```
  6. `goToVerse`: use the same id choice — `document.getElementById(view === "reading" ? verseId(surahNumber, n) : \`v${n}\`)`.
  7. Handlers:
     ```ts
     function chooseView(v: ReadView) {
       setView(v);
       saveReadView(v);
     }
     function chooseSize(k: string) {
       setSizeKey(k);
       saveSizeKey(k);
     }
     ```
  8. Root element: `<div style={{ ["--read-scale" as string]: String(scaleFor(sizeKey)) }}>`.
  9. In the controls bar, replace the inner `<div style={{ display: "flex", gap: 14 ... }}>…</div>` (both button groups) with
     `<ReadingControls sizeKey={sizeKey} onSize={chooseSize} view={view} onView={chooseView} />`.
  10. Replace the `status === "ready"` content block's basmalah + verse list with:
      ```tsx
      {view === "reading" ? (
        <ReadingText
          ayahs={ayahs}
          marks={marks}
          surahNames={new Map()}
          headings={false}
          activeKey={selected?.verseKey ?? flashKey}
          onSelect={setSelected}
        />
      ) : (
        <>
          {surahNumber !== 1 && surahNumber !== 9 && (
            <p className="arabic" lang="ar" style={{ textAlign: "center", padding: "18px 0 4px" }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}
          {ayahs.map((a) => (
            <VerseBlock
              key={a.verseKey}
              ayah={a}
              id={`v${a.ayah}`}
              index={index}
              onCommentary={setOpenAyah}
              flash={flashKey === a.verseKey}
            />
          ))}
        </>
      )}
      ```
      (keep the existing "Next surah" block after it).
  11. Next to the `CommentarySheet`, add:
      ```tsx
      {selected && (
        <VerseSheet ayah={selected} index={index} tafsir={tafsir} onClose={() => setSelected(null)} />
      )}
      ```

- [ ] **Step 9: Verify types and tests**

Run: `npx tsc -b && npm test`
Expected: clean, all pass.

- [ ] **Step 10: Check the end-of-ayah mark renders as an ornament**

Start `npx vite --port 5199`, open `/read/1`, choose **Reading**, zoom into the end of verse 1.
- If each verse ends in the decorative ayah medallion with the number inside: done.
- If it shows plain Arabic-Indic digits: in `ReadingText.tsx` change the marker to `{"۝" + toArabicDigits(a.ayah)}` and re-check.
- If neither composes into a medallion: use `{"﴿" + toArabicDigits(a.ayah) + "﴾"}` (﴿١﴾).
Say which variant was used in your task report (not in the commit message, which stays one line).

- [ ] **Step 11: Manual behaviour check** (dev server)
  - `/read/2` Reading: text flows and justifies; ۞ appears before 2:26; tapping a verse highlights it and opens the verse sheet; "Read the commentary" swaps to commentary inside the sheet and "← Back to the verse" returns; "Reflect on this verse" goes to `/tadabbur/2?v=<n>`.
  - `/read/7?v=206` in Reading: scrolls to 7:206, which shows ۩ and glows briefly.
  - `/read/9` Reading: no basmalah. `/read/1` Reading: no extra basmalah.
  - Toggle back to Translation: blocks with translation, commentary and share work.
  - Reload: the chosen view persists. Text size buttons scale Reading text.
  - Night mode: all reading colours legible.

- [ ] **Step 12: Commit**

```bash
git add src/lib/readingPrefs.ts src/components/ReadingControls.tsx src/lib/useLastReadTracker.ts src/components/ReadingText.tsx src/components/VerseSheet.tsx src/pages/Surah.tsx src/lib/analytics.ts src/pages/Stats.tsx src/index.css
git commit -m "feat: add a flowing Reading mode to the surah reader"
```

---

### Task 6: Juz page

**Files:**
- Create: `src/pages/Juz.tsx`
- Modify: `src/App.tsx` (import + route)

**Interfaces:**
- Consumes: `loadDivisions`, `loadSurahs`, `loadSurahAyahs`, `loadTafsirIndex` (data.ts); `spansInRange`, `makeMarks`, `juzOf`, `verseId`, `Marks` (Task 2); `CommentarySheet`, `useTafsir`, `TafsirIndex` (Task 3); `VerseBlock` (Task 4); `ReadingControls`, `ReadingText`, `VerseSheet`, `readingPrefs`, `useLastReadTracker` (Task 5).
- Produces: route `/read/juz/:n` with optional `?v=S:A`.

- [ ] **Step 1: Create `src/pages/Juz.tsx`**:

```tsx
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CommentarySheet, useTafsir, type TafsirIndex } from "../components/Commentary";
import ReadingControls from "../components/ReadingControls";
import ReadingText from "../components/ReadingText";
import VerseBlock from "../components/VerseBlock";
import VerseSheet from "../components/VerseSheet";
import { loadDivisions, loadSurahAyahs, loadSurahs, loadTafsirIndex } from "../lib/data";
import { juzOf, makeMarks, spansInRange, verseId, type Marks } from "../lib/divisions";
import { recordLastRead } from "../lib/progress";
import {
  getReadView,
  getSizeKey,
  saveReadView,
  saveSizeKey,
  scaleFor,
  type ReadView,
} from "../lib/readingPrefs";
import type { Ayah, Division } from "../lib/types";
import { useLastReadTracker } from "../lib/useLastReadTracker";

const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

// Keyed on the juz so moving to the next one starts from clean state.
export default function Juz() {
  const { n } = useParams<{ n: string }>();
  return <JuzReader key={n} />;
}

function JuzReader() {
  const { n } = useParams<{ n: string }>();
  const juz = Number(n);
  const [params] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [range, setRange] = useState<Division | null>(null);
  const [hizbs, setHizbs] = useState<Division[]>([]);
  const [marks, setMarks] = useState<Marks | null>(null);
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  const [index, setIndex] = useState<TafsirIndex | null>(null);
  const [missing, setMissing] = useState<number[]>([]);
  const [view, setView] = useState<ReadView>(getReadView);
  const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [openAyah, setOpenAyah] = useState<Ayah | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const tafsir = useTafsir();

  useEffect(() => {
    document.title = `Juz ${juz} — MindfulVerse`;
  }, [juz]);

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) {
      setStatus("error");
      return;
    }
    (async () => {
      try {
        const [divs, surahs, idx] = await Promise.all([
          loadDivisions(),
          loadSurahs(),
          loadTafsirIndex().catch(() => null),
        ]);
        const r = divs.juz.find((j) => j.n === juz);
        if (!r) throw new Error(`juz ${juz}`);
        const counts = new Map(surahs.map((s) => [s.number, s.ayahCount]));
        const spans = spansInRange(r.first, r.last, counts);
        const slices = await Promise.all(
          spans.map((sp) =>
            loadSurahAyahs(sp.surah)
              .then((list) => list.filter((a) => a.ayah >= sp.from && a.ayah <= sp.to))
              .catch(() => null)
          )
        );
        if (!active) return;
        setRange(r);
        setHizbs(divs.hizb.filter((h) => juzOf(h.first, divs) === juz));
        setMarks(makeMarks(divs));
        setSurahNames(new Map(surahs.map((s) => [s.number, s.name])));
        setIndex(idx);
        setMissing(spans.filter((_, i) => slices[i] === null).map((sp) => sp.surah));
        setAyahs(slices.flatMap((s) => s ?? []));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [juz]);

  // Deep link (?v=S:A): scroll there in either view and glow briefly.
  useEffect(() => {
    if (status !== "ready") return;
    const key = params.get("v");
    if (!key || !/^\d+:\d+$/.test(key)) return;
    const [s, a] = key.split(":").map(Number);
    const el = document.getElementById(verseId(s, a));
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    recordLastRead(s, a);
    setFlashKey(key);
    const t = window.setTimeout(() => setFlashKey(null), 1600);
    return () => window.clearTimeout(t);
  }, [status, params, view]);

  useLastReadTracker(status === "ready", null, view);

  function chooseView(v: ReadView) {
    setView(v);
    saveReadView(v);
  }
  function chooseSize(k: string) {
    setSizeKey(k);
    saveSizeKey(k);
  }

  const name = (s: number) => surahNames.get(s) ?? `Surah ${s}`;
  const rangeLabel = range
    ? (() => {
        const [fs, fa] = range.first.split(":").map(Number);
        const [ls, la] = range.last.split(":").map(Number);
        return `${name(fs)} ${fa} – ${name(ls)} ${la}`;
      })()
    : "";

  // Translation view: one heading per surah section.
  const sections: { surah: number; ayahs: Ayah[] }[] = [];
  for (const a of ayahs) {
    const last = sections[sections.length - 1];
    if (last && last.surah === a.surah) last.ayahs.push(a);
    else sections.push({ surah: a.surah, ayahs: [a] });
  }

  return (
    <div style={{ ["--read-scale" as string]: String(scaleFor(sizeKey)) }}>
      <header style={{ marginBottom: 12 }}>
        <Link to="/read?tab=juz" className="btn ghost">
          ← All juz
        </Link>
        <p className="eyebrow" style={{ marginTop: 14 }}>
          Juz
        </p>
        <h1 style={{ marginTop: 2 }}>Juz {juz}</h1>
        {range && (
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {rangeLabel}
          </p>
        )}
        {hizbs.length > 0 && (
          <p style={{ margin: "8px 0 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
            {hizbs.map((h) => (
              <Link key={h.n} to={`/read/juz/${juz}?v=${h.first}`} replace>
                Hizb {h.n}
              </Link>
            ))}
          </p>
        )}
      </header>

      {status === "ready" && (
        <div style={{ padding: "10px 0 16px", borderBottom: "1px solid var(--line)", marginBottom: 4 }}>
          <ReadingControls sizeKey={sizeKey} onSize={chooseSize} view={view} onView={chooseView} />
        </div>
      )}

      {status === "loading" && <p className="muted">Loading…</p>}

      {status === "error" && (
        <div className="card">
          <p className="soft" style={{ margin: 0 }}>
            This juz isn’t available right now. Please try again in a little while.
          </p>
        </div>
      )}

      {status === "ready" && missing.length > 0 && (
        <p className="soft" style={{ fontSize: ".9rem" }}>
          Part of this juz ({missing.map(name).join(", ")}) couldn’t be loaded right now.
        </p>
      )}

      {status === "ready" &&
        (view === "reading" ? (
          <ReadingText
            ayahs={ayahs}
            marks={marks}
            surahNames={surahNames}
            headings
            activeKey={selected?.verseKey ?? flashKey}
            onSelect={setSelected}
          />
        ) : (
          sections.map((sec) => (
            <section key={sec.surah}>
              <h2 className="reading-surah-name">
                <Link to={`/read/${sec.surah}`} style={{ color: "inherit" }}>
                  {name(sec.surah)}
                </Link>
                {sec.ayahs[0].ayah > 1 && <span className="muted"> · from verse {sec.ayahs[0].ayah}</span>}
              </h2>
              {sec.ayahs[0].ayah === 1 && sec.surah !== 1 && sec.surah !== 9 && (
                <p className="arabic" lang="ar" style={{ textAlign: "center", padding: "10px 0 4px" }}>
                  {BASMALAH}
                </p>
              )}
              {sec.ayahs.map((a) => (
                <VerseBlock
                  key={a.verseKey}
                  ayah={a}
                  id={verseId(a.surah, a.ayah)}
                  index={index}
                  onCommentary={setOpenAyah}
                  flash={flashKey === a.verseKey}
                />
              ))}
            </section>
          ))
        ))}

      {status === "ready" && juz < 30 && (
        <div style={{ padding: "28px 0 8px" }}>
          <Link to={`/read/juz/${juz + 1}`} className="btn secondary">
            Next juz
          </Link>
        </div>
      )}

      {selected && (
        <VerseSheet ayah={selected} index={index} tafsir={tafsir} onClose={() => setSelected(null)} />
      )}
      {openAyah && (
        <CommentarySheet ayah={openAyah} index={index} tafsir={tafsir} onClose={() => setOpenAyah(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the route** — in `src/App.tsx` add `import Juz from "./pages/Juz";` and, next to the surah route:

```tsx
<Route path="/read/juz/:n" element={<Juz />} />
```

- [ ] **Step 3: Verify**

Run: `npx tsc -b && npm test`. Then in the dev server:
- `/read/juz/1` — both views; headings "Al-Fatihah" and "Al-Baqarah"; Hizb 1 · Hizb 2 links; "Hizb 2" scrolls to 2:75 and glows; "Next juz" → `/read/juz/2`, whose heading reads "Al-Baqarah · from verse 142".
- `/read/juz/30` — 37 surah headings, basmalah before each except none duplicated; scrolls smoothly; no "Next juz".
- `/read/juz/31` — the calm error card.
- Commentary in Translation view and the verse sheet in Reading view open the right surah's commentary (check a verse in 78 and one in 114).
- Scroll partway, go Home: "Continue" points at a verse inside the juz.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Juz.tsx src/App.tsx
git commit -m "feat: read the Qur'an by juz with hizb jump points"
```

---

### Task 7: Surah | Juz tabs on the Read page

**Files:**
- Modify: `src/pages/Reader.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `loadDivisions` (Task 2); `Division` type (Task 1).
- Produces: `/read?tab=juz` shows the juz list; `/read` (or `?tab=surah`) the surah list.

- [ ] **Step 1: Add tab state and juz data** — in `Reader.tsx`:
  - imports: `useSearchParams` from `react-router-dom`; `loadDivisions` from `../lib/data`; `Division` from `../lib/types`.
  - state:
    ```ts
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "juz" ? "juz" : "surah";
    const [juzList, setJuzList] = useState<Division[]>([]);
    const [hizbList, setHizbList] = useState<Division[]>([]);
    const [juzFailed, setJuzFailed] = useState(false);
    ```
  - effect (loads once, the file is a few KB):
    ```ts
    useEffect(() => {
      let active = true;
      loadDivisions()
        .then((d) => {
          if (!active) return;
          setJuzList(d.juz);
          setHizbList(d.hizb);
        })
        .catch(() => active && setJuzFailed(true));
      return () => {
        active = false;
      };
    }, []);
    ```
  - Header copy: change `<p className="muted">Browse all 114 surahs.</p>` to `<p className="muted">Browse by surah or by juz.</p>`.

- [ ] **Step 2: Render the tabs** — after the "Continue reading" card, before the loading/error blocks:

```tsx
<div className="reading-controls" role="tablist" aria-label="Browse by">
  {(["surah", "juz"] as const).map((t) => (
    <button
      key={t}
      role="tab"
      className="size-btn"
      aria-selected={tab === t}
      aria-pressed={tab === t}
      onClick={() => setParams(t === "surah" ? {} : { tab: t }, { replace: true })}
    >
      {t === "surah" ? "Surah" : "Juz"}
    </button>
  ))}
</div>
```

Wrap the existing `status === "ready"` surah search + list in `{tab === "surah" && ( ... )}` (keep the loading/error blocks for the surah tab only by also guarding them with `tab === "surah" &&`).

- [ ] **Step 3: Render the juz list** — below:

```tsx
{tab === "juz" && juzFailed && (
  <div className="card">
    <p className="muted" style={{ margin: 0 }}>Juz browsing isn’t available right now.</p>
  </div>
)}

{tab === "juz" && !juzFailed && (
  <div className="stack">
    {juzList.map((j) => {
      const [fs, fa] = j.first.split(":").map(Number);
      const [ls, la] = j.last.split(":").map(Number);
      const name = (s: number) => surahs.find((x) => x.number === s)?.name ?? `Surah ${s}`;
      const hizbs = hizbList.filter((h) => h.n === j.n * 2 - 1 || h.n === j.n * 2);
      return (
        <div key={j.n} className="card juz-card">
          <Link to={`/read/juz/${j.n}`} className="juz-main">
            <span className="eyebrow juz-num">{j.n}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 650, display: "block" }}>Juz {j.n}</span>
              <span className="muted" style={{ fontSize: ".9rem" }}>
                {name(fs)} {fa} – {name(ls)} {la}
              </span>
            </span>
            {j.opening && (
              <span className="juz-opening" lang="ar" dir="rtl">
                {j.opening}
              </span>
            )}
          </Link>
          <p className="juz-hizbs">
            {hizbs.map((h) => (
              <Link key={h.n} to={`/read/juz/${j.n}?v=${h.first}`}>
                Hizb {h.n}
              </Link>
            ))}
          </p>
        </div>
      );
    })}
  </div>
)}
```

(Hizb 2n−1 and 2n belong to juz n — two hizbs per juz; the data test in Task 1 plus Task 2's `hizbOf` tests guard the boundaries.)

- [ ] **Step 4: Styles** — append to `src/index.css`:

```css
/* --- Read index: juz rows --- */
.juz-card { display: block; }
.juz-main { display: flex; align-items: center; gap: 14px; color: var(--ink); }
.juz-num { min-width: 36px; text-align: center; }
.juz-opening {
  font-family: var(--font-arabic); color: var(--indigo-deep);
  font-size: 1.25rem; line-height: 1.8; flex: none; max-width: 45%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.juz-hizbs { display: flex; gap: 16px; margin: 8px 0 0 50px; font-size: .92rem; }
```

- [ ] **Step 5: Verify**

Run: `npx tsc -b && npm test`. Dev server:
- `/read` shows Surah tab as before (search works). Tap **Juz** → URL `?tab=juz`, 30 rows with range, Arabic opening words, "Hizb 1 · Hizb 2" … "Hizb 59 · Hizb 60".
- Open a juz, press "← All juz" or browser Back → returns to the Juz tab.
- At 390px wide the Arabic opening truncates cleanly; nothing overflows horizontally.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Reader.tsx src/index.css
git commit -m "feat: browse the reader by surah or juz"
```

---

### Task 8: Visual and regression pass

**Files:** none new in the repo (screenshot script lives in the session scratchpad).

- [ ] **Step 1: Screenshot matrix** — with `npx vite --port 5199` running, write a Playwright script (Playwright is in `node_modules`; import it by absolute path to `node_modules/playwright/index.mjs`) that, for `colorScheme` light and dark (set `localStorage["mindfulverse.theme.v1"]` to `"light"`/`"dark"` via `addInitScript`), at viewports 390×844 and 1200×900, and for `localStorage["mindfulverse.readView.v1"]` = `"translation"` and `"reading"`, visits:
  `/read`, `/read?tab=juz`, `/read/1`, `/read/2`, `/read/9`, `/read/7?v=206`, `/read/juz/1`, `/read/juz/30`
  waits 2200 ms (the splash holds ≥1.4 s), takes full-page screenshots, and logs any `pageerror` and whether `document.documentElement.scrollWidth > innerWidth`.

- [ ] **Step 2: Look at every screenshot** and fix anything sloppy: overflow, clipped Arabic diacritics (raise `.reading-text` line-height), low-contrast marks in dark mode, headings colliding with the theme toggle, uneven spacing between surah sections. Re-run until clean.

- [ ] **Step 3: Full checks**

Run: `npx tsc -b && npm test && npm run build`
Expected: clean; all tests pass; build succeeds (precache count may rise slightly — `divisions.json` is under `/data`, so it is runtime-cached, not precached).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A src
git commit -m "fix: polish reading mode and juz layout"
```
(Skip if nothing changed. Never `git add` anything under `docs/superpowers/`.)
