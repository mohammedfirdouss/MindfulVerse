// The anonymous feelings cloud: an opt-in share of the feeling words a reader
// taps for a surah, and the per-surah totals once 10 readers have shared.
// Only approved feeling words, the surah number and the random install id
// leave the device; never what the reader writes. Sharing never throws and
// never blocks saving.
import { getInstallId } from "./installId";
import { FEELINGS, MAX_FEELINGS } from "./reflectionPrompts";
import { insforge } from "./sync/insforge";

export const CLOUD_OPT_IN_KEY = "mindfulverse.feelingCloud.v1";
export const CLOUD_MIN_READERS = 10;
const SURAH_COUNT = 114;

export const CLOUD_COPY = {
  offline: "The cloud couldn't load. Check your connection and try again.",
  optIn: "Add my feelings to the anonymous cloud",
  optInHelp: "Only the words you tap are shared, never what you write.",
  retry: "Try again",
  reveal: "See how others felt",
  title: "How others felt",
  tooFew: `The cloud appears once ${CLOUD_MIN_READERS} readers have shared their feelings on this surah.`,
} as const;

export function getCloudOptIn(): boolean {
  try {
    return localStorage.getItem(CLOUD_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCloudOptIn(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(CLOUD_OPT_IN_KEY, "1");
    } else {
      localStorage.removeItem(CLOUD_OPT_IN_KEY);
    }
  } catch {
    /* storage blocked: the tick simply stays off next time */
  }
}

// Off until the app says otherwise. Like the "opened today" ping, only the
// live site (not a dev server, preview or test browser) and release builds
// write to the shared table, so test runs never pollute real clouds.
let sharingAllowed = false;

export function allowFeelingSharing(allowed: boolean): void {
  sharingAllowed = allowed;
}

export interface SurahFeelingRow {
  install_id: string;
  surah: number;
  feeling: string;
}

/** Resolves to the insert error, or null on success. */
export type SendSurahFeeling = (row: SurahFeelingRow) => Promise<unknown>;

export interface FeelingTotal {
  feeling: string;
  readers: number;
}

export type FeelingCloud = FeelingTotal[] | "too-few" | "offline";

/** Resolves to the RPC's { data, error }. */
export type FetchFeelingCloud = (
  surah: number
) => Promise<{ data: unknown; error: unknown }>;

const sendToInsforge: SendSurahFeeling = async (row) => {
  const { error } = await insforge.database
    .from("surah_feelings")
    .insert([row]);
  return error;
};

const fetchFromInsforge: FetchFeelingCloud = async (surah) =>
  await insforge.database.rpc("surah_feeling_cloud", { p_surah: surah });

function isSurah(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= SURAH_COUNT;
}

/** The approved words among `feelings`, deduped, in FEELINGS order. */
function approvedWords(feelings: readonly string[]): string[] {
  return FEELINGS.filter((f) => feelings.includes(f)).slice(0, MAX_FEELINGS);
}

/**
 * Shares the chosen feeling words for a surah, one insert per word. A word
 * already shared by this install is rejected by the primary key (409/23505),
 * which is fine: it is already counted. Does nothing unless sharing is
 * allowed on this build and the reader ticked the box. Never rejects.
 */
export async function shareFeelings(
  surah: number,
  feelings: readonly string[],
  send: SendSurahFeeling = sendToInsforge
): Promise<void> {
  try {
    if (!(sharingAllowed && getCloudOptIn() && isSurah(surah))) {
      return;
    }
    const words = approvedWords(feelings);
    if (words.length === 0) {
      return;
    }
    const installId = getInstallId();
    await Promise.all(
      words.map(async (feeling) => {
        try {
          await send({ feeling, install_id: installId, surah });
        } catch {
          /* offline: this word is simply not counted */
        }
      })
    );
  } catch {
    /* never let sharing reach the save path */
  }
}

function toTotals(data: unknown): FeelingTotal[] {
  if (!Array.isArray(data)) {
    return [];
  }
  const readersByWord = new Map<string, number>();
  for (const row of data) {
    const r = row as { feeling?: unknown; readers?: unknown } | null;
    const readers = Number(r?.readers);
    const word = FEELINGS.find((f) => f === r?.feeling);
    if (word && Number.isFinite(readers) && readers > 0) {
      readersByWord.set(word, Math.round(readers));
    }
  }
  // FEELINGS order, so the cloud reads the same every time.
  return FEELINGS.filter((f) => readersByWord.has(f)).map((feeling) => ({
    feeling,
    readers: readersByWord.get(feeling) ?? 0,
  }));
}

/**
 * The surah's feelings cloud: totals in FEELINGS order, "too-few" while fewer
 * than 10 readers have shared, or "offline" on a network or server error.
 * Never rejects.
 */
export async function fetchFeelingCloud(
  surah: number,
  fetchCloud: FetchFeelingCloud = fetchFromInsforge
): Promise<FeelingCloud> {
  if (!isSurah(surah)) {
    return "too-few";
  }
  try {
    const { data, error } = await fetchCloud(surah);
    if (error || !Array.isArray(data)) {
      return "offline";
    }
    const totals = toTotals(data);
    return totals.length > 0 ? totals : "too-few";
  } catch {
    return "offline";
  }
}

/** A font size for each word, scaled by readers between `min` and `max`. */
export function cloudFontSize(
  readers: number,
  totals: readonly FeelingTotal[],
  min: number,
  max: number
): number {
  const counts = totals.map((t) => t.readers);
  const low = Math.min(...counts);
  const high = Math.max(...counts);
  if (!(high > low)) {
    return Math.round((min + max) / 2);
  }
  const share = (readers - low) / (high - low);
  return Math.round(min + share * (max - min));
}

/** What a screen reader hears for one word, e.g. "Peaceful, 12 readers". */
export function cloudWordLabel(t: FeelingTotal): string {
  return `${t.feeling}, ${t.readers} ${t.readers === 1 ? "reader" : "readers"}`;
}
