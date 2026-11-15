import {
  loadAyahsByKeys,
  loadSurahs,
  loadVerseTopics,
} from "@mindfulverse/core/data";
import {
  relatedTopicLabel,
  relatedTopics,
  verseReference,
} from "@mindfulverse/core/relatedVerses";
import type { RelatedTopic } from "@mindfulverse/core/relatedVerses";
import type { Ayah } from "@mindfulverse/core/types";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";

type Verses =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; ayahs: Ayah[] };

function TopicRow({
  topic,
  names,
  onNavigate,
}: {
  topic: RelatedTopic;
  names: Map<number, string> | null;
  onNavigate: () => void;
}) {
  const [verses, setVerses] = useState<Verses>({ kind: "closed" });
  const listId = useId();
  const open = verses.kind !== "closed";

  async function toggle() {
    if (open) {
      setVerses({ kind: "closed" });
      return;
    }
    setVerses({ kind: "loading" });
    try {
      setVerses({ ayahs: await loadAyahsByKeys(topic.verses), kind: "ready" });
    } catch {
      setVerses({ kind: "failed" });
    }
  }

  return (
    <li>
      <button
        type="button"
        className="related-topic"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => void toggle()}
      >
        <span>{relatedTopicLabel(topic)}</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div id={listId}>
        {verses.kind === "loading" && <p className="muted">Opening…</p>}
        {verses.kind === "failed" && (
          <p className="muted">
            These verses aren’t available offline yet. Try again when you’re
            connected.
          </p>
        )}
        {verses.kind === "ready" && (
          <ul className="related-verses">
            {verses.ayahs.map((a) => (
              <li key={a.verseKey}>
                <p className="translation">{a.translation}</p>
                <Link
                  className="commentary-open"
                  to={`/read/${a.surah}?v=${a.ayah}`}
                  replace
                  onClick={onNavigate}
                >
                  {verseReference(a.verseKey, names)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/** Other verses that share a topic with this one. Renders nothing when the
 *  verse has no topic, or the topic list can't be read. */
export default function RelatedVerses({
  ayah,
  onNavigate,
}: {
  ayah: Ayah;
  /** Called when a verse link is followed, so the sheet can close. */
  onNavigate: () => void;
}) {
  const [topics, setTopics] = useState<RelatedTopic[]>([]);
  const [names, setNames] = useState<Map<number, string> | null>(null);

  useEffect(() => {
    let live = true;
    setTopics([]);
    const load = async () => {
      try {
        const all = await loadVerseTopics();
        if (live) {
          setTopics(relatedTopics(all, ayah.verseKey));
        }
        const surahs = await loadSurahs();
        if (live) {
          setNames(new Map(surahs.map((s) => [s.number, s.name])));
        }
      } catch {
        /* the commentary below still stands on its own */
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [ayah.verseKey]);

  if (topics.length === 0) {
    return null;
  }
  return (
    <section className="related" aria-label="Other verses on this">
      <h3 className="deeper-heading">Other verses on this</h3>
      <ul className="related-topics">
        {topics.map((t) => (
          <TopicRow
            key={t.name}
            topic={t}
            names={names}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}
