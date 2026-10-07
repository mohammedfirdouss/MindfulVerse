// An unsaved check-in reflection survives leaving the screen (or the OS
// killing the app). Same key as web; localStorage is the MMKV shim here.
const DRAFT_KEY = "mindfulverse.checkinDraft.v1";

export function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(v: string): void {
  try {
    if (v) localStorage.setItem(DRAFT_KEY, v);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage full or blocked — the draft is a convenience */
  }
}
