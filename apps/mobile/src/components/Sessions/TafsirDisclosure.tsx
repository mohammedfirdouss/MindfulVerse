import { commentaryParagraphs } from "@mindfulverse/core/commentaryText";
// Web's SessionPlayer TafsirDisclosure: Ibn Kathir for the step's verses, read
// on first open. Long entries show their opening paragraphs verbatim with the
// rest one tap away, so a session stays guided rather than like homework.
import { loadSurahTafsir, parseVerseKey } from "@mindfulverse/core/data";
import { useState } from "react";
import { View } from "react-native";

import { radius, space, useTheme } from "../../theme";
import { Diamond, Text } from "../../ui";
import { ActionLink } from "../Reader/ActionLink";
import { coveringFromIndex } from "../Tadabbur/logic";
import { excerptCount, verseLabel } from "./logic";

interface TafsirEntry {
  verseKey: string;
  /** The ayah the commentary is stored under: the verse itself, or the first
   *  verse of the passage that covers it. */
  source: number;
  text: string;
}

type TafsirStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; entries: TafsirEntry[] };

function TafsirExcerpt({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = commentaryParagraphs(text);
  const count = excerptCount(paragraphs);
  const truncated = count < paragraphs.length;
  const shown = expanded ? paragraphs : paragraphs.slice(0, count);
  return (
    <View style={{ alignItems: "flex-start", gap: space.sm + 4 }}>
      {shown.map((p, i) => (
        <Text key={i} selectable>
          {p}
        </Text>
      ))}
      {truncated && !expanded ? (
        <ActionLink
          title="Read the full commentary"
          onPress={() => setExpanded(true)}
          style={{ justifyContent: "center", minHeight: 44 }}
        />
      ) : null}
    </View>
  );
}

export function TafsirDisclosure({
  verseKeys,
  surahNames,
}: {
  verseKeys: string[];
  surahNames: Map<number, string>;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TafsirStatus>({ kind: "idle" });

  async function load() {
    setStatus({ kind: "loading" });
    try {
      const surahs = [
        ...new Set(verseKeys.map((vk) => parseVerseKey(vk).surah)),
      ];
      const maps = await Promise.all(surahs.map((s) => loadSurahTafsir(s)));
      const bySurah = new Map(surahs.map((s, i) => [s, maps[i]]));
      const entries: TafsirEntry[] = [];
      // Two verses of one passage share an entry; show it once.
      const shown = new Set<string>();
      for (const vk of verseKeys) {
        const { surah, ayah } = parseVerseKey(vk);
        const map = bySurah.get(surah) ?? {};
        const indexed = Object.keys(map)
          .map(Number)
          .sort((a, b) => a - b);
        const source = coveringFromIndex(indexed, ayah);
        const text = source === null ? undefined : map[String(source)];
        const id = `${surah}:${source}`;
        if (source !== null && text && !shown.has(id)) {
          shown.add(id);
          entries.push({ source, text, verseKey: vk });
        }
      }
      setStatus({ entries, kind: "ready" });
    } catch {
      setStatus({ kind: "error" });
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && (status.kind === "idle" || status.kind === "error")) {
      void load();
    }
  }

  return (
    <View style={{ alignItems: "flex-start", gap: space.md }}>
      <ActionLink
        title={open ? "Hide the commentary" : "Read the commentary"}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={{ justifyContent: "center", minHeight: 44 }}
      />
      {open ? (
        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: colors.cottonRaised,
            borderColor: colors.line,
            borderLeftColor: colors.indigo,
            borderLeftWidth: 3,
            borderRadius: radius.md,
            borderWidth: 1,
            gap: space.lg,
            padding: space.lg,
          }}
        >
          {status.kind === "loading" || status.kind === "idle" ? (
            <Text variant="muted" accessibilityLiveRegion="polite">
              Fetching the commentary…
            </Text>
          ) : null}
          {status.kind === "error" ? (
            <Text variant="muted">
              The commentary isn’t available right now.
            </Text>
          ) : null}
          {status.kind === "ready" && status.entries.length === 0 ? (
            <Text variant="muted">
              There’s no commentary for these verses yet.
            </Text>
          ) : null}
          {status.kind === "ready"
            ? status.entries.map((e) => (
                <View key={e.verseKey} style={{ gap: space.sm }}>
                  <View
                    style={{
                      alignItems: "center",
                      flexDirection: "row",
                      gap: space.sm,
                    }}
                  >
                    <View
                      importantForAccessibility="no-hide-descendants"
                      accessibilityElementsHidden
                    >
                      <Diamond
                        label={parseVerseKey(e.verseKey).ayah}
                        size={28}
                        tone="outline"
                      />
                    </View>
                    <Text variant="eyebrow">
                      Ibn Kathir on {verseLabel(e.verseKey, surahNames)}
                      {e.source === parseVerseKey(e.verseKey).ayah
                        ? ""
                        : ` (with verse ${e.source})`}
                    </Text>
                  </View>
                  <TafsirExcerpt text={e.text} />
                </View>
              ))
            : null}
          {status.kind === "ready" && status.entries.length > 0 ? (
            <Text variant="muted" style={{ fontSize: 14, lineHeight: 21 }}>
              Verses quoted in the commentary use a different English
              translation.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
