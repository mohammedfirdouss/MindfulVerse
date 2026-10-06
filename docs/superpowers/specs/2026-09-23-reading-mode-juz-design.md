# Reading mode + Juz/Hizb navigation — design

Date: 2026-09-23 · Status: approved in chat, pending spec review

## Problem

The reader only offers verse-by-verse blocks ("Arabic + English" or "Arabic only").
There is no continuous, mushaf-style reading like quran.com's Reading view, and no
way to read by juz or hizb — the divisions most people use for daily portions and
khatm plans.

## Decisions (from brainstorming)

- **Flowing text, not page replicas.** The QUL mushaf layouts (604 `.docx` pages) are
  encoded as QCF V2 private-use glyphs that need 604 per-page fonts we don't ship,
  with no glyph→verse mapping. Reading mode is therefore continuous justified text in
  the app's Uthmanic Hafs font. Printed-page fidelity is out of scope.
- **Reading replaces "Arabic only".** Toggle becomes **Translation | Reading**.
- **Navigation: Surah | Juz tabs** on `/read`. Each juz row offers its two hizbs as
  jump points. Hizb quarters and sajdah verses are marked inline in the text.

## Data

`scripts/build-data.mjs` gains one output, `public/data/divisions.json`, built from
`QUL copy/Quran metadata/quran-metadata-{juz,hizb,rub,sajda}.json`:

```json
{
  "juz":   [{ "n": 1, "first": "1:1", "last": "2:141", "opening": "<first 3 words>" }, ...30],
  "hizb":  [{ "n": 1, "first": "1:1", "last": "2:74" }, ...60],
  "rub":   ["1:1", "2:26", ...240 quarter start keys],
  "sajda": [{ "key": "7:206", "type": "optional" }, ...15]
}
```

A few KB. Cached on first use like every other `/data` file (the service worker's CacheFirst rule).
Juz `opening` is the first three words of the juz's first verse, copied verbatim at
build time — the juz list must not download ~26 surah files just to label its rows.

## Modules

- `src/lib/divisions.ts` — `loadDivisions()`, and pure helpers:
  `juzOf(key)`, `hizbOf(key)`, `isRubStart(key)`, `sajdaAt(key)`,
  `versesInRange(first, last)` → `{ surah, from, to }[]` spans. Pure functions take the
  loaded divisions as an argument so they are unit-testable without fetch.
- `src/components/ReadingText.tsx` — renders a list of ayahs as flowing Arabic:
  surah heading + bismillah at surah starts (none for 9; none extra for 1, where it
  is verse 1), each verse a tappable inline span ending in the end-of-ayah mark
  (U+06DD + Arabic-Indic number; verify the Hafs font's rendering, fall back to
  ﴿n﴾ if it doesn't compose), ۞ before rub starts, ۩ after sajdah verses. Justified,
  RTL, honours `--read-scale` and both themes. Each verse span carries `id="v{surah}-{ayah}"`
  for deep links.
- `src/components/VerseSheet.tsx` — bottom sheet for a tapped verse: translation,
  reference, then Commentary · Share · Reflect on this verse (→ tadabbur at that
  verse). Reuses the existing commentary sheet's styles and focus handling from
  `Surah.tsx`, which is refactored to share it rather than duplicate it.
- `src/pages/Juz.tsx` — route `/read/juz/:n`, optional `?v=S:A`. Loads the surah files
  its range spans, slices them, renders Translation (existing verse blocks) or Reading
  (`ReadingText`), with a surah heading at the start of every surah section (noting
"from verse n" when a juz opens mid-surah), "Next juz" at the end
  (not after 30). Records last-read like the surah reader.
- `src/pages/Reader.tsx` — Surah | Juz tabs (tab remembered in `?tab=juz` so Back
  returns to it). Juz list: number, opening words (Arabic), range, and "Hizb a · Hizb b"
  links to `/read/juz/n?v=<hizb first key>`.
- `src/pages/Surah.tsx` — view toggle becomes Translation | Reading; Reading renders
  `ReadingText`. Stored view value migrates: old `"arabic"` → `"reading"`.

## Behaviour details

- Deep links: `?v=` on a surah (existing, ayah number) and on a juz (`S:A` key) scroll
  to the verse in either mode and briefly highlight it. Translation blocks keep their
  current `id="v{ayah}"` on the surah page; everywhere else (Reading spans, juz pages,
  which can hold two surahs with the same ayah numbers) ids are `v{surah}-{ayah}`. The
  deep-link effect looks up whichever id the active view renders.
- Last read: tapping or scrolling a verse into view records it (existing
  `recordLastRead`), so Home/Read "continue" works from both surah and juz reading.
- Analytics: `read_view` event's `view` union becomes `"translation" | "reading"`. Stats
  shows the stored preference via the same reader that migrates `"arabic"` → Reading and
  `"both"` → Translation, so older values keep working.
- Errors: missing `divisions.json` → Juz tab shows "Juz browsing isn't available right
  now"; surah files failing inside a juz → calm inline message, rest still renders.

## Out of scope

Printed-page (604) replicas, QCF fonts, word-by-word, audio, tajweed colouring,
rub/manzil navigation lists, khatm planner.

## Testing

- Vitest for `divisions.ts`: juz/hizb membership at boundaries (1:7, 2:141, 2:142,
  114:6), `versesInRange` across multi-surah juz (juz 30: 78:1–114:6), rub/sajda lookups.
- Build-data check: 30 / 60 / 240 / 15 entries; juz ranges contiguous and cover 6236 verses.
- Visual pass with Playwright screenshots: Reading and Translation, light/dark,
  390px and desktop, on surah 1, surah 2, surah 9, juz 1, juz 30.
- Performance sanity: juz 1 (Al-Baqarah slice) and juz 30 (78 surahs) render
  without jank on a mid phone viewport.
