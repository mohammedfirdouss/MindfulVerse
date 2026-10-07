// Collapsible Ibn Kathir commentary for one verse (web's VerseCommentary):
// the surah's tafsir file is read on first open; a passage's commentary is
// stored under its first ayah ("with verse n"). Its toggle sits in the verse's
// action row beside `actions` (Share), as kola text links like the reader's.
import { memo, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { Ayah, SurahTafsir } from "@mindfulverse/core/types";
import { ActionLink } from "../Reader/ActionLink";
import { radius, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { commentaryToggleLabel, splitParagraphs } from "./logic";

export const VerseCommentary = memo(function VerseCommentary({
  ayah,
  covering,
  ensureTafsir,
  tafsir,
  indexUnavailable,
  actions,
}: {
  ayah: Ayah;
  covering: number | null;
  ensureTafsir: () => void;
  /** null until the tafsir file has been read. */
  tafsir: SurahTafsir | null;
  indexUnavailable: boolean;
  /** Other actions for the verse (Share), shown in the same row. */
  actions?: ReactNode;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  if (indexUnavailable || covering === null) {
    return (
      <View style={{ gap: space.sm }}>
        {actions ? <View style={{ flexDirection: "row", alignItems: "flex-start" }}>{actions}</View> : null}
        <Text variant="muted">
          {indexUnavailable ? "The commentary isn’t available right now." : "No commentary for this verse."}
        </Text>
      </View>
    );
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: space.sm }}>
        <ActionLink
          title={commentaryToggleLabel(open, ayah.ayah, covering)}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
        />
        {actions}
      </View>
      {open ? (
        <View
          style={{
            backgroundColor: colors.cottonRaised,
            borderWidth: 1,
            borderColor: colors.line,
            borderLeftWidth: 3,
            borderLeftColor: colors.indigo,
            borderRadius: radius.md,
            padding: space.lg,
            gap: space.md,
          }}
        >
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
        </View>
      ) : null}
    </View>
  );
});
