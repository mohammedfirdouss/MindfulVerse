// The verse of the day — shared by Home and the daily check-in so the whole
// app agrees on one verse per day. Deterministic: stable across reloads,
// rotates at local midnight.
//
// CURATION RULE (theological safety, from the plan): every verse here must be
// self-evidently comforting WHEN STANDING ALONE — no warning tails, no battle
// or ruling context, nothing that needs its neighbours to read as gentle.
// Each addition is vetted against the actual bundled translation.

export const DAILY_VERSES: string[] = [
  "94:5", // with every hardship comes ease
  "94:6",
  "2:286", // no soul burdened beyond capacity
  "13:28", // hearts find rest in remembrance
  "2:152", // remember Me, I will remember you
  "3:139", // do not lose heart
  "65:3", // whoever relies on Allah — He suffices
  "39:53", // do not despair of Allah's mercy
  "3:200", // persevere in patience
  "2:45", // seek help in patience and prayer
  "12:87", // never give up hope of Allah's mercy
  "93:5", // your Lord will give until you are pleased
  "93:7", // He found you wandering and guided you
  "2:186", // I am indeed close — I answer the caller
  "10:57", // a healing for the hearts
  "29:69", // those who strive — We will guide them
  "16:97", // a good and pure life for the righteous
  "25:63", // the servants who walk gently
  "93:3", // your Lord has not forsaken you
  "93:4", // what comes after is better
  "20:46", // fear not — I am with you, I hear and see
  "2:153", // Allah is with the patient
  "31:22", // the most trustworthy hand-hold
  "16:128", // Allah is with those who do good
  "73:8", // remember His name, devote yourself wholly
];

/** Days since epoch, local time — flips at the user's own midnight. */
function localDayIndex(): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(startOfDay.getTime() / 86_400_000);
}

/** Today's verse key — same all day, different tomorrow. */
export function todayVerseKey(): string {
  return DAILY_VERSES[localDayIndex() % DAILY_VERSES.length];
}
