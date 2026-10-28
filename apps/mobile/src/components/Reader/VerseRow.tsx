import type { Ayah } from "@mindfulverse/core/types";
import { memo } from "react";
import { View } from "react-native";

import { useShareVerse } from "../../share";
import { fonts, space, useTheme } from "../../theme";
import { ArabicText, Text } from "../../ui";
import { ActionLink } from "./ActionLink";
import { commentaryLabel, coveringFor } from "./commentary";
import type { TafsirIndex } from "./commentary";

/** Web's `.roundel`: the verse number on an indigo diamond. */
function Roundel({ n }: { n: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <View
        style={{
          backgroundColor: colors.indigo,
          height: 24,
          position: "absolute",
          transform: [{ rotate: "45deg" }],
          width: 24,
        }}
      />
      <Text
        style={{
          color: colors.cottonRaised,
          fontFamily: fonts.readSemiBold,
          fontSize: 13,
          lineHeight: 16,
        }}
      >
        {n}
      </Text>
    </View>
  );
}

/** Translation view row (web VerseBlock): roundel + dye-line, the Arabic, the
 *  translation, then Commentary / Share. Memoised: a FlatList re-render only
 *  repaints rows whose props changed (size, flash, tafsir index). */
export const VerseRow = memo(
  ({
    ayah,
    scale,
    index,
    flash,
    onCommentary,
  }: {
    ayah: Ayah;
    scale: number;
    index: TafsirIndex | null;
    flash: boolean;
    onCommentary: (a: Ayah) => void;
  }) => {
    const { colors } = useTheme();
    const share = useShareVerse("reader");
    const covering = coveringFor(index, ayah);
    return (
      <View
        accessibilityLabel={`Verse ${ayah.ayah}`}
        style={{
          backgroundColor: flash ? colors.indigoWash : "transparent",
          marginHorizontal: -space.sm,
          paddingHorizontal: space.sm,
          paddingVertical: space.lg,
        }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Roundel n={ayah.ayah} />
          <View
            style={{ backgroundColor: colors.indigoWash, flex: 1, height: 2 }}
          />
        </View>
        <ArabicText scale={scale} style={{ marginBottom: 14, marginTop: 4 }}>
          {ayah.arabic}
        </ArabicText>
        <Text variant="translation" scale={scale}>
          {ayah.translation}
        </Text>
        <View
          style={{
            columnGap: space.lg,
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 12,
            rowGap: space.sm,
          }}
        >
          <ActionLink
            title={commentaryLabel(index, ayah)}
            accessibilityLabel={
              covering === null
                ? undefined
                : `${commentaryLabel(index, ayah)}, verse ${ayah.verseKey}`
            }
            disabled={covering === null}
            onPress={() => onCommentary(ayah)}
          />
          <ActionLink
            title={share.label ?? "Share"}
            accessibilityLabel={`Share verse ${ayah.verseKey}`}
            onPress={() => void share.share(ayah)}
          />
        </View>
      </View>
    );
  }
);
