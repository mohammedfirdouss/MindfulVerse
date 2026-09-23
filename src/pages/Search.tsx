// Search — English translation search over the bundled search index.
// The ~1MB index is fetched lazily on the first submitted query (data.ts
// caches it in memory afterwards), never on mount.

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadSearchIndex, parseVerseKey } from "../lib/data";

const MAX_RESULTS = 50;
const SNIPPET_RADIUS = 90;

interface Result {
  verseKey: string;
  surah: number;
  ayah: number;
  snippet: string;
  /** Offset of the first match within the snippet is implicit — the snippet
   *  is centred on it; highlighting re-finds every occurrence. */
}

interface SearchOutcome {
  term: string;
  results: Result[];
  capped: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Curly and straight apostrophes match each other. Same-length replacement,
 *  so match offsets stay valid against the original text. */
function normApostrophes(s: string): string {
  return s.replace(/[’‘]/g, "'");
}

/** Trim a long translation to a window around the first match. */
function makeSnippet(text: string, matchIndex: number, matchLength: number): string {
  if (text.length <= SNIPPET_RADIUS * 2 + matchLength) return text;
  let start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  let end = Math.min(text.length, matchIndex + matchLength + SNIPPET_RADIUS);
  // Snap to word boundaries so the ellipses don't cut words in half.
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp < matchIndex) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > matchIndex + matchLength) end = sp;
  }
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Case-insensitive substring search; exact whole-word matches rank first. */
function runSearch(index: [string, string][], term: string): SearchOutcome {
  const q = normApostrophes(term).toLowerCase();
  const wordRe = new RegExp(`\\b${escapeRegExp(q)}\\b`, "i");
  const exact: Result[] = [];
  const partial: Result[] = [];
  let total = 0;

  for (const [verseKey, translation] of index) {
    const plain = normApostrophes(translation);
    const at = plain.toLowerCase().indexOf(q);
    if (at === -1) continue;
    total++;
    const bucket = wordRe.test(plain) ? exact : partial;
    if (exact.length >= MAX_RESULTS && bucket === partial) continue; // can't be shown
    const { surah, ayah } = parseVerseKey(verseKey);
    bucket.push({ verseKey, surah, ayah, snippet: makeSnippet(translation, at, q.length) });
  }

  const results = [...exact, ...partial].slice(0, MAX_RESULTS);
  return { term, results, capped: total > MAX_RESULTS };
}

/** Wrap every occurrence of the term in <mark>, case-insensitively. */
function highlight(snippet: string, term: string): ReactNode[] {
  const pattern = escapeRegExp(normApostrophes(term)).replace(/'/g, "['’‘]");
  const parts = snippet.split(new RegExp(`(${pattern})`, "gi"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{
          background: "var(--kola)",
          color: "var(--cotton)",
          padding: "0 3px",
          borderRadius: 3,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export default function Search() {
  // The term lives in the URL (?q=) so coming back from a result restores it.
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(() => params.get("q") ?? "");
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    document.title = "Search — MindfulVerse";
  }, []);

  async function search(term: string) {
    const my = ++reqId.current;
    setError(false);
    setLoadingIndex(true); // only visible on the first search — later loads resolve from cache
    try {
      const index = await loadSearchIndex();
      if (my === reqId.current) setOutcome(runSearch(index, term));
    } catch {
      if (my === reqId.current) setError(true);
    } finally {
      if (my === reqId.current) setLoadingIndex(false);
    }
  }

  // Re-run a search restored from the URL (the index is cached, so instant).
  useEffect(() => {
    const q = params.get("q")?.trim();
    if (q) void search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const term = input.trim();
    if (!term) return;
    setParams({ q: term }, { replace: true });
    void search(term);
  }

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Search</p>
        <h1>Find a verse</h1>
      </header>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search the translation — e.g. mercy, patience"
          aria-label="Search the translation"
          className="field-input"
          style={{ flex: 1, minWidth: 0, width: "auto" }}
        />
        <button type="submit" className="btn" disabled={loadingIndex}>
          Search
        </button>
      </form>

      {loadingIndex && <p className="muted">Loading the search index…</p>}

      {error && !loadingIndex && (
        <p className="soft">Something went wrong loading the search index — please try again.</p>
      )}

      {outcome && !loadingIndex && !error && (
        outcome.results.length === 0 ? (
          <p className="soft">
            Nothing found for “{outcome.term}” — try a simpler word.
          </p>
        ) : (
          <section aria-label="Search results">
            <p className="muted" style={{ marginBottom: 6 }}>
              {outcome.capped
                ? `Showing first ${MAX_RESULTS}`
                : `${outcome.results.length} ${outcome.results.length === 1 ? "verse" : "verses"}`}
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {outcome.results.map((r) => (
                <li key={r.verseKey} style={{ borderTop: "2px solid var(--indigo-wash)" }}>
                  <Link
                    to={`/read/${r.surah}?v=${r.ayah}`}
                    style={{ display: "block", padding: "16px 4px", color: "inherit" }}
                  >
                    <span className="eyebrow">{r.verseKey}</span>
                    <p className="soft" style={{ margin: "4px 0 0" }}>
                      {highlight(r.snippet, outcome.term)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
