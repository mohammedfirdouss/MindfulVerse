// A verse as the check-in shows it (web CheckIn.tsx AyahView): Arabic,
// translation, then "Surah name · 2:255". `onCloth` lays it on an AdireCloth
// panel (the verse of the day): cotton Arabic and translation, soft reference,
// as Home's hero does. The reference row can carry a trailing action.
import type { ReactNode } from "react";
import { View } from "react-native";
import type { Ayah } from "@mindfulverse/core/types";
import { space } from "../../theme";
import { ArabicText, Text, useOnCloth } from "../../ui";

export function AyahView({
  ayah,
  surahName,
  scale,
  onCloth = false,
  trailing,
}: {
  ayah: Ayah;
  surahName?: string;
  scale: number;
  onCloth?: boolean;
  trailing?: ReactNode;
}) {
  const cloth = useOnCloth();
  return (
    <View style={{ gap: onCloth ? space.sm : space.md }}>
      <ArabicText scale={scale} style={onCloth ? { color: cloth.strong } : undefined}>
        {ayah.arabic}
      </ArabicText>
      <Text
        variant="translation"
        scale={scale}
        style={onCloth ? { color: cloth.strong, fontSize: 19.5 * scale, lineHeight: 30 * scale } : undefined}
      >
        {ayah.translation}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          columnGap: space.md,
          marginTop: onCloth ? space.xs : 0,
        }}
      >
        <Text
          variant="muted"
          style={
            onCloth
              ? { fontSize: 14.5, lineHeight: 20, color: cloth.soft }
              : { fontSize: 13.6, lineHeight: 20 }
          }
        >
          {surahName ? `${surahName} · ` : ""}
          {ayah.verseKey}
        </Text>
        {trailing}
      </View>
    </View>
  );
}
