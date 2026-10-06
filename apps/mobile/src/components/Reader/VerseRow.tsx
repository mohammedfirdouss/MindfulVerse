import { memo } from "react";
import { View } from "react-native";
import type { Ayah } from "@mindfulverse/core/types";
import { fonts, space, useTheme } from "../../theme";
import { ArabicText, Text } from "../../ui";
import { ActionLink } from "./ActionLink";
import { commentaryLabel, coveringFor, type TafsirIndex } from "./commentary";
import { useShareVerse } from "../../share";

/** Web's `.roundel`: the verse number on an indigo diamond. */
function Roundel({ n }: { n: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{ position: "absolute", width: 24, height: 24, backgroundColor: colors.indigo, transform: [{ rotate: "45deg" }] }}
      />
      <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 13, lineHeight: 16, color: colors.cottonRaised }}>{n}</Text>
    </View>
  );
}

/** Translation view row (web VerseBlock): roundel + dye-line, the Arabic, the
 *  translation, then Commentary / Share. Memoised: a FlatList re-render only
 *  repaints rows whose props changed (size, flash, tafsir index). */
export const VerseRow = memo(function VerseRow({
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
}) {
  const { colors } = useTheme();
  const share = useShareVerse("reader");
  const covering = coveringFor(index, ayah);
  return (
    <View
      accessibilityLabel={`Verse ${ayah.ayah}`}
      style={{
        paddingVertical: space.lg,
        paddingHorizontal: space.sm,
        marginHorizontal: -space.sm,
        backgroundColor: flash ? colors.indigoWash : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Roundel n={ayah.ayah} />
        <View style={{ flex: 1, height: 2, backgroundColor: colors.indigoWash }} />
      </View>
      <ArabicText scale={scale} style={{ marginTop: 4, marginBottom: 14 }}>
        {ayah.arabic}
      </ArabicText>
      <Text variant="translation" scale={scale}>
        {ayah.translation}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.lg, rowGap: space.sm, marginTop: 12 }}>
        <ActionLink
          title={commentaryLabel(index, ayah)}
          accessibilityLabel={covering === null ? undefined : `${commentaryLabel(index, ayah)}, verse ${ayah.verseKey}`}
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
});
