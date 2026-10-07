// One reflection (web Journal.tsx EntryCard): date, the verse it was written
// about, the session it came from, prompt, body, and a quiet delete that
// confirms with Alert.alert instead of web's inline "Yes, delete / Keep".
import { Alert, Pressable, View } from "react-native";
import { parseVerseKey } from "@mindfulverse/core/data";
import type { Ayah, JournalEntry } from "@mindfulverse/core/types";
import { space, useTheme } from "../../theme";
import { ArabicText, Card, LinkPressable, Text } from "../../ui";
import { entryVerseKey, formatDate } from "./journalText";

// Web shows the entry's verse at 1.35rem against .arabic's 1.9rem.
const ENTRY_ARABIC = 1.35 / 1.9;

function EntryVerse({ verseKey, ayah }: { verseKey: string; ayah: Ayah }) {
  const { colors } = useTheme();
  const { surah, ayah: n } = parseVerseKey(verseKey);
  return (
    <LinkPressable
      href={{ pathname: "/read/[surah]", params: { surah: String(surah), v: String(n) } }}
      accessibilityLabel={`Verse ${verseKey}: ${ayah.translation}. Open in the reader.`}
      style={({ pressed }) => ({
        borderLeftWidth: 3,
        borderLeftColor: colors.indigoWash,
        paddingLeft: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <ArabicText scale={ENTRY_ARABIC}>{ayah.arabic}</ArabicText>
      <Text variant="soft" style={{ fontSize: 16.2, lineHeight: 25, marginTop: 4 }}>
        {ayah.translation}
      </Text>
      <Text variant="eyebrow" style={{ marginTop: 4 }}>
        {verseKey}
      </Text>
    </LinkPressable>
  );
}

export function EntryCard({
  entry,
  verses,
  sessionTitles,
  onDelete,
}: {
  entry: JournalEntry;
  verses: Map<string, Ayah>;
  sessionTitles: Map<string, string>;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();
  const verseRef = entryVerseKey(entry);
  const verse = verseRef ? verses.get(verseRef) : undefined;
  const sessionRef = entry.context?.kind === "session" && entry.context.ref ? entry.context.ref : null;

  function confirmDelete() {
    Alert.alert("Delete this reflection?", undefined, [
      { text: "Keep", style: "cancel" },
      { text: "Yes, delete", style: "destructive", onPress: () => onDelete(entry.id) },
    ]);
  }

  return (
    <Card>
      <Text variant="muted" style={{ fontSize: 13.6, lineHeight: 20 }}>
        {formatDate(entry.createdAt)}
      </Text>
      {verseRef && verse ? <EntryVerse verseKey={verseRef} ayah={verse} /> : null}
      {sessionRef ? (
        // Sessions are deferred on native, so this is a label, not a link.
        <Text variant="eyebrow">From the session “{sessionTitles.get(sessionRef) ?? sessionRef}”</Text>
      ) : null}
      {entry.prompt ? (
        <Text style={{ fontStyle: "italic", color: colors.inkSoft }}>{entry.prompt}</Text>
      ) : null}
      <Text selectable>{entry.body}</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete this reflection"
          onPress={confirmDelete}
          hitSlop={space.sm}
          style={({ pressed }) => ({ paddingVertical: space.xs, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: colors.kola, fontSize: 14.5, lineHeight: 22 }}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}
