// build-data.mjs — reads raw Quran data and emits app-bundled JSON under public/data/.
// Pure Node ESM. Run from repo root: `node scripts/build-data.mjs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const QUL = path.join(ROOT, "QUL copy");
const OUT = path.join(ROOT, "public", "data");

/**
 * Resolve the "directory-named-file" quirk: some sources are named e.g.
 * `foo.json` but are actually a directory containing `foo.json` inside.
 * Given an expected path, return the real file path.
 */
function resolveFile(expected) {
  if (!fs.existsSync(expected)) {
    throw new Error(`Source not found: ${expected}`);
  }
  const stat = fs.statSync(expected);
  if (stat.isFile()) return expected;
  if (stat.isDirectory()) {
    const inner = path.join(expected, path.basename(expected));
    if (fs.existsSync(inner) && fs.statSync(inner).isFile()) return inner;
    // Fall back to the sole file inside the directory.
    const entries = fs
      .readdirSync(expected)
      .filter((e) => fs.statSync(path.join(expected, e)).isFile());
    if (entries.length === 1) return path.join(expected, entries[0]);
    throw new Error(`Could not resolve file inside directory: ${expected}`);
  }
  throw new Error(`Unexpected node type: ${expected}`);
}

function readJSON(expected) {
  return JSON.parse(fs.readFileSync(resolveFile(expected), "utf8"));
}

/**
 * Strip HTML to readable plain text.
 * - block-level tags -> paragraph breaks
 * - <br> -> newline
 * - remaining tags removed
 * - decode common entities
 * - collapse runs of whitespace but preserve paragraph breaks (\n\n)
 */
function stripHtml(html) {
  if (html == null) return "";
  let s = String(html);
  // Convert closing block tags to paragraph separators.
  s = s.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|tr|table)>/gi, "\n\n");
  // <br> and opening list items -> newline.
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n- ");
  // Remove all remaining tags.
  s = s.replace(/<[^>]+>/g, "");
  // Decode common named + numeric entities.
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#(\d+);/g, (_, d) => {
      const cp = Number(d);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : _;
    });
  // Normalize newlines: collapse 3+ into exactly 2 (paragraph break).
  // First, trim spaces on each line and drop spaces around newlines.
  s = s.replace(/[ \t]*\n[ \t]*/g, "\n");
  // Collapse horizontal whitespace runs within lines.
  s = s.replace(/[ \t]{2,}/g, " ");
  // Collapse 3+ newlines to 2.
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(OUT);
  ensureDir(path.join(OUT, "quran"));
  ensureDir(path.join(OUT, "tafsir"));
  ensureDir(path.join(OUT, "info"));

  // ---- Load sources ----
  const ayahMeta = readJSON(
    path.join(QUL, "Quran metadata", "quran-metadata-ayah.json"),
  );
  const surahNames = readJSON(
    path.join(QUL, "Quran metadata", "quran-metadata-surah-name.json"),
  );
  const tafsir = readJSON(
    path.join(QUL, "Tafsirs", "en-tafisr-ibn-kathir.json"),
  );
  const yusufali = readJSON(path.join(ROOT, "raw-data", "en-yusufali.json"));

  // ---- Build translation lookup keyed by "surah:ayah" ----
  const trByKey = new Map();
  for (const row of yusufali.quran) {
    trByKey.set(`${row.chapter}:${row.verse}`, row.text);
  }

  // ---- Group ayahs by surah, count per surah ----
  const bySurah = new Map(); // surah -> array of ayah objects
  const ayahCounts = new Map(); // surah -> max ayah number seen
  let totalAyahs = 0;
  const missingTranslations = [];

  for (const key of Object.keys(ayahMeta)) {
    const m = ayahMeta[key];
    const surah = m.surah_number;
    const ayah = m.ayah_number;
    const verseKey = m.verse_key || `${surah}:${ayah}`;
    const translation = trByKey.get(verseKey) ?? "";
    if (!trByKey.has(verseKey)) missingTranslations.push(verseKey);

    // Strip trailing ayah-number glyph (Arabic-Indic digits) if present.
    // e.g. "... ٱلرَّحِيمِ ١" -> drop the trailing " ١".
    let arabic = m.text.trim().replace(/[\s۝]*[٠-٩۰-۹]+$/u, "").trim();

    const obj = { surah, ayah, verseKey, arabic, translation };
    if (!bySurah.has(surah)) bySurah.set(surah, []);
    bySurah.get(surah).push(obj);
    ayahCounts.set(surah, Math.max(ayahCounts.get(surah) ?? 0, ayah));
    totalAyahs++;
  }

  // ---- Write quran/{surah}.json ----
  const surahNumbers = [...bySurah.keys()].sort((a, b) => a - b);
  for (const surah of surahNumbers) {
    const arr = bySurah.get(surah).sort((a, b) => a.ayah - b.ayah);
    fs.writeFileSync(
      path.join(OUT, "quran", `${surah}.json`),
      JSON.stringify(arr),
    );
  }

  // ---- surahs.json ----
  const surahsMeta = surahNumbers.map((number) => {
    const meta = surahNames[String(number)];
    const name = meta?.name_simple || meta?.name || `Surah ${number}`;
    return { number, name, ayahCount: ayahCounts.get(number) };
  });
  fs.writeFileSync(
    path.join(OUT, "surahs.json"),
    JSON.stringify(surahsMeta, null, 0),
  );

  // ---- tafsir/{surah}.json ----
  // Group tafsir entries by surah -> { "<ayah>": cleanedText }.
  const tafsirBySurah = new Map();
  for (const vk of Object.keys(tafsir)) {
    const [sStr, aStr] = vk.split(":");
    const s = Number(sStr);
    const a = Number(aStr);
    if (!Number.isFinite(s) || !Number.isFinite(a)) continue;
    const raw = tafsir[vk]?.text;
    const cleaned = stripHtml(raw);
    if (!cleaned) continue; // omit empty
    if (!tafsirBySurah.has(s)) tafsirBySurah.set(s, {});
    tafsirBySurah.get(s)[String(a)] = cleaned;
  }
  let surahsWithTafsir = 0;
  for (const s of [...tafsirBySurah.keys()].sort((a, b) => a - b)) {
    const map = tafsirBySurah.get(s);
    if (Object.keys(map).length === 0) continue;
    surahsWithTafsir++;
    fs.writeFileSync(
      path.join(OUT, "tafsir", `${s}.json`),
      JSON.stringify(map),
    );
  }

  // ---- info/{surah}.json ----
  const surahInfo = readJSON(
    path.join(QUL, "Surah Info", "surah-info-en.json"),
  );
  let infoWritten = 0;
  const missingInfo = [];
  for (let n = 1; n <= 114; n++) {
    const entry = surahInfo[String(n)];
    const text = stripHtml(entry?.text);
    if (!entry || !text) {
      missingInfo.push(n);
      continue;
    }
    fs.writeFileSync(
      path.join(OUT, "info", `${n}.json`),
      JSON.stringify({ surah: n, name: entry.surah_name ?? "", text }),
    );
    infoWritten++;
  }

  // ---- themes.json ----
  const db = new Database(
    resolveFile(path.join(QUL, "Ayah Theme", "ayah-themes.db")),
    { readonly: true },
  );
  const rows = db
    .prepare(
      "SELECT theme, surah_number, ayah_from, ayah_to FROM themes ORDER BY surah_number, ayah_from, ayah_to",
    )
    .all();
  db.close();
  const themes = rows.map((r, i) => ({
    id: i,
    theme: r.theme,
    surah: r.surah_number,
    ayahFrom: r.ayah_from,
    ayahTo: r.ayah_to,
  }));
  fs.writeFileSync(path.join(OUT, "themes.json"), JSON.stringify(themes));

  // ---- tafsir-index.json ----
  // Which ayahs carry a direct tafsir entry, per surah. Lets the reader show
  // accurate commentary links without eagerly downloading megabytes of tafsir.
  const tafsirIndex = {};
  for (let n = 1; n <= 114; n++) {
    const entries = tafsirBySurah.get(n);
    tafsirIndex[n] = entries
      ? Object.keys(entries).map(Number).sort((a, b) => a - b)
      : [];
  }
  fs.writeFileSync(path.join(OUT, "tafsir-index.json"), JSON.stringify(tafsirIndex));

  // ---- search.json ----
  // Compact translation search index: [verseKey, translation] pairs.
  // Loaded on demand only when the user searches (metered-data friendly).
  const search = [];
  for (const n of surahNumbers) {
    for (const a of bySurah.get(n)) search.push([a.verseKey, a.translation]);
  }
  fs.writeFileSync(path.join(OUT, "search.json"), JSON.stringify(search));

  // ---- Summary ----
  console.log("=== build-data summary ===");
  console.log(`tafsir index surahs:   ${Object.keys(tafsirIndex).length}`);
  console.log(`search entries:        ${search.length}`);
  console.log(`surahs written:        ${surahNumbers.length}`);
  console.log(`total ayahs:           ${totalAyahs}`);
  console.log(`surahs with tafsir:    ${surahsWithTafsir}`);
  console.log(`themes:                ${themes.length}`);
  console.log(`surah info written:    ${infoWritten}`);
  if (missingInfo.length) {
    console.log(`WARNING missing surah info: ${missingInfo.join(", ")}`);
  }
  if (missingTranslations.length) {
    console.log(
      `WARNING missing translations: ${missingTranslations.length} (e.g. ${missingTranslations.slice(0, 5).join(", ")})`,
    );
  } else {
    console.log(`missing translations:  0`);
  }
  console.log("--- spot-check surah 1 ayah 1 ---");
  const s1 = bySurah.get(1).find((x) => x.ayah === 1);
  console.log(`arabic:      ${s1.arabic}`);
  console.log(`translation: ${s1.translation}`);
  const t11 = tafsirBySurah.get(1)?.["1"] ?? "(none)";
  console.log(`tafsir[1:1]: ${t11.slice(0, 200)}`);
}

main();
