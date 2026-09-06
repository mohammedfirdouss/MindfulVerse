// The verse of the day — shared by Home and the daily check-in so the whole
// app agrees on one verse per day. Deterministic: stable across reloads and
// identical for every visitor on the same date; rotates at local midnight.
//
// CURATION RULE (theological safety): every verse here is individually vetted
// against the bundled translation to be self-evidently comforting or uplifting
// WHEN STANDING ALONE — no warning tails, no battle/ruling context. The pool
// spans ease, mercy, nearness, patience, dua, remembrance, provision, creation,
// and gratitude. Permanently excluded despite fame: 65:2, 40:60, 14:7, 8:46,
// 2:155 (alone), 3:173, 24:26, 9:129 (alone), 7:156, 21:87 (alone), 3:186.
//
// The day index is hash-scrambled so consecutive days land in different parts
// of the pool (the pool contains near-twins like 94:5/94:6 — walked in order
// they would read as "the verse never changed").

const DAILY_VERSES: string[] = [
  "94:5", "94:6", "94:1", "94:2", "94:3", "94:4", "94:7", "94:8", "93:1", "93:2",
  "93:3", "93:4", "93:5", "93:7", "93:11", "3:139", "39:53", "12:87", "10:57", "10:58",
  "10:62", "10:64", "16:96", "16:97", "2:25", "18:107", "19:96", "85:11", "39:17", "39:18",
  "41:30", "41:31", "46:13", "2:268", "11:115", "25:75", "76:12", "13:28", "2:186", "50:16",
  "20:46", "33:3", "9:51", "26:62", "3:174", "8:2", "2:255", "24:35", "2:286", "42:25",
  "11:90", "85:14", "57:28", "3:31", "6:54", "4:110", "23:118", "21:83", "28:16", "110:3",
  "3:159", "39:66", "29:69", "2:45", "2:153", "2:156", "2:157", "3:200", "103:3", "90:17",
  "41:35", "32:24", "16:127", "16:128", "40:55", "50:39", "31:22", "73:8", "2:201", "3:8",
  "25:74", "14:40", "17:80", "20:25", "20:26", "28:24", "112:1", "112:2", "112:3", "112:4",
  "113:1", "114:1", "33:41", "33:42", "33:43", "7:205", "76:25", "3:191", "29:60", "11:6",
  "17:30", "34:39", "42:19", "51:58", "67:15", "39:52", "28:73", "16:53", "55:13", "30:21",
  "30:22", "16:65", "16:66", "16:68", "16:69", "36:33", "36:34", "36:36", "55:5", "55:6",
  "55:10", "67:19", "88:17", "88:18", "88:19", "88:20", "51:47", "51:49", "78:6", "78:7",
  "78:8", "78:9", "78:10", "78:11", "2:152", "16:18", "27:19", "108:1", "108:2",
];

/** Days since epoch, local time — flips at the user's own midnight. */
function localDayIndex(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(startOfDay.getTime() / 86_400_000);
}

/** Today's verse key ("surah:ayah"). Async to keep a stable API for callers
 *  (and room to grow the source of verses later without touching pages).
 *
 *  Stride walk: the pool length (139) is prime, so stepping by 53 each day
 *  visits every verse exactly once per 139-day cycle — zero repeats, and
 *  consecutive days land ~53 positions apart (different categories), unlike
 *  a raw hash which can serve the same verse twice in one week. */
export async function todayVerseKey(): Promise<string> {
  const n = DAILY_VERSES.length;
  return DAILY_VERSES[(localDayIndex() * 53) % n];
}
