import { View } from "react-native";
import { arabicSurahName, revelationPlace } from "../../data/surahs";
import { fonts, space } from "../../theme";
import { AdireCloth, ArabicText, Text, useOnCloth } from "../../ui";

/** The surah's opening: its Arabic name on dyed cloth, then the English name,
 *  place of revelation and length. */
export function TitlePlate({ surah, name, ayahCount }: { surah: number; name?: string; ayahCount?: number }) {
  const cloth = useOnCloth();
  const arabic = arabicSurahName(surah);
  const place = revelationPlace(surah);
  const details = [place, ayahCount ? `${ayahCount} verses` : null].filter(Boolean).join(" · ");
  return (
    <AdireCloth style={{ paddingVertical: 22, paddingHorizontal: space.lg, alignItems: "center" }}>
      <View accessible accessibilityRole="header" accessibilityLabel={[name, details].filter(Boolean).join(", ")} style={{ alignItems: "center" }}>
        {arabic ? (
          <ArabicText style={{ color: cloth.strong, textAlign: "center", fontSize: 42, lineHeight: 72 }}>{arabic}</ArabicText>
        ) : null}
        {name ? (
          <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 21, lineHeight: 27, color: cloth.strong }}>{name}</Text>
        ) : null}
        <Text style={{ fontSize: 14.5, lineHeight: 21, color: cloth.soft, marginTop: 2 }}>
          {`Surah ${surah}${details ? ` · ${details}` : ""}`}
        </Text>
      </View>
    </AdireCloth>
  );
}
