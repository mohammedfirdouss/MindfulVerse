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
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { ActionLink } from "./ActionLink";

type Verses =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; ayahs: Ayah[] };

function TopicRow({
  topic,
  names,
  onOpenVerse,
}: {
  topic: RelatedTopic;
  names: Map<number, string> | null;
  onOpenVerse: (a: Ayah) => void;
}) {
  const { colors } = useTheme();
  const [verses, setVerses] = useState<Verses>({ kind: "closed" });
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
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => void toggle()}
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: space.md,
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        <Text
          style={{
            color: colors.indigo,
            flex: 1,
            fontFamily: fonts.readMedium,
          }}
        >
          {relatedTopicLabel(topic)}
        </Text>
        <Text style={{ color: colors.indigo }}>{open ? "−" : "+"}</Text>
      </Pressable>
      {verses.kind === "loading" ? <Text variant="muted">Opening…</Text> : null}
      {verses.kind === "failed" ? (
        <Text variant="muted">Couldn’t open these verses. Try again.</Text>
      ) : null}
      {verses.kind === "ready"
        ? verses.ayahs.map((a) => (
            <View
              key={a.verseKey}
              style={{
                borderLeftColor: colors.indigoWash,
                borderLeftWidth: 2,
                gap: 6,
                marginBottom: space.sm,
                paddingLeft: space.md,
                paddingVertical: space.sm,
              }}
            >
              <Text variant="translation">{a.translation}</Text>
              <ActionLink
                title={verseReference(a.verseKey, names)}
                accessibilityLabel={`Open ${verseReference(a.verseKey, names)}`}
                onPress={() => onOpenVerse(a)}
              />
            </View>
          ))
        : null}
    </View>
  );
}

/** Web's RelatedVerses: other verses that share a topic with this one.
 *  Renders nothing when the verse has no topic. */
export function RelatedVerses({
  ayah,
  onOpenVerse,
}: {
  ayah: Ayah;
  onOpenVerse: (a: Ayah) => void;
}) {
  const { colors } = useTheme();
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
    <View
      style={{
        borderBottomColor: colors.line,
        borderBottomWidth: 1,
        paddingBottom: space.md,
      }}
    >
      <SectionHeading>Mentioned elsewhere</SectionHeading>
      {topics.map((t) => (
        <TopicRow
          key={t.name}
          topic={t}
          names={names}
          onOpenVerse={onOpenVerse}
        />
      ))}
    </View>
  );
}

/** Web's `.deeper-heading`: a small quiet label above each part. */
export function SectionHeading({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.indigo,
        fontFamily: fonts.readSemiBold,
        fontSize: 13.6,
        lineHeight: 19,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}
