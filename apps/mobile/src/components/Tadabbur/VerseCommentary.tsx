// Collapsible Ibn Kathir commentary for one verse (web's VerseCommentary):
// the surah's tafsir file is read on first open; a passage's commentary is
// stored under its first ayah ("with verse n").
import { memo, useState } from "react";
import { View } from "react-native";
import type { Ayah, SurahTafsir } from "@mindfulverse/core/types";
import { space } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { commentaryToggleLabel, splitParagraphs } from "./logic";

export const VerseCommentary = memo(function VerseCommentary({
  ayah,
  covering,
  ensureTafsir,
  tafsir,
  indexUnavailable,
}: {
  ayah: Ayah;
  covering: number | null;
  ensureTafsir: () => void;
  /** null until the tafsir file has been read. */
  tafsir: SurahTafsir | null;
  indexUnavailable: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (indexUnavailable) {
    return <Text variant="muted">The commentary isn’t available right now.</Text>;
  }
  if (covering === null) {
    return <Text variant="muted">No commentary for this verse.</Text>;
  }

  const direct = covering === ayah.ayah;
  const text = tafsir ? (tafsir[String(covering)] ?? "") : null;
  const paragraphs = splitParagraphs(text);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) ensureTafsir();
  }

  return (
    <View style={{ gap: space.md }}>
      <View style={{ alignItems: "flex-start" }}>
        <Button
          kind="ghost"
          title={commentaryToggleLabel(open, ayah.ayah, covering)}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
        />
      </View>
      {open ? (
        <Card>
          <Text variant="eyebrow">
            {direct ? `Ibn Kathir · ${ayah.verseKey}` : `Ibn Kathir · with verse ${covering}`}
          </Text>
          {text === null ? (
            <Text variant="muted" accessibilityLiveRegion="polite">
              Opening the commentary…
            </Text>
          ) : paragraphs.length === 0 ? (
            <Text variant="muted">The commentary isn’t available right now.</Text>
          ) : (
            <View style={{ gap: space.sm + 4 }}>
              {paragraphs.map((p, i) => (
                <Text key={i} selectable>
                  {p}
                </Text>
              ))}
            </View>
          )}
        </Card>
      ) : null}
    </View>
  );
});
