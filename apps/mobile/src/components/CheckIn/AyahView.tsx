// A verse as the check-in shows it (web CheckIn.tsx AyahView): Arabic,
// translation, then "Surah name · 2:255".
import { View } from "react-native";
import type { Ayah } from "@mindfulverse/core/types";
import { space } from "../../theme";
import { ArabicText, Text } from "../../ui";

export function AyahView({ ayah, surahName, scale }: { ayah: Ayah; surahName?: string; scale: number }) {
  return (
    <View style={{ gap: space.md }}>
      <ArabicText scale={scale}>{ayah.arabic}</ArabicText>
      <Text variant="translation" scale={scale}>
        {ayah.translation}
      </Text>
      <Text variant="muted" style={{ fontSize: 13.6, lineHeight: 20 }}>
        {surahName ? `${surahName} · ` : ""}
        {ayah.verseKey}
      </Text>
    </View>
  );
}
