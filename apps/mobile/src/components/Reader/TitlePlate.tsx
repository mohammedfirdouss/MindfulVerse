import {
  arabicSurahName,
  revelationPlace,
} from "@mindfulverse/core/surahNames";
import { View } from "react-native";

import { fonts, space } from "../../theme";
import { AdireCloth, ArabicText, Text, useOnCloth } from "../../ui";

/** The surah's opening: its Arabic name on dyed cloth, then the English name,
 *  place of revelation and length. */
export function TitlePlate({
  surah,
  name,
  ayahCount,
}: {
  surah: number;
  name?: string;
  ayahCount?: number;
}) {
  const cloth = useOnCloth();
  const arabic = arabicSurahName(surah);
  const place = revelationPlace(surah);
  const details = [place, ayahCount ? `${ayahCount} verses` : null]
    .filter(Boolean)
    .join(", ");
  return (
    <AdireCloth
      style={{
        alignItems: "center",
        paddingHorizontal: space.lg,
        paddingVertical: 22,
      }}
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={[name, details].filter(Boolean).join(", ")}
        style={{ alignItems: "center" }}
      >
        {arabic ? (
          <ArabicText
            style={{
              color: cloth.strong,
              fontSize: 42,
              lineHeight: 72,
              textAlign: "center",
            }}
          >
            {arabic}
          </ArabicText>
        ) : null}
        {name ? (
          <Text
            style={{
              color: cloth.strong,
              fontFamily: fonts.readSemiBold,
              fontSize: 21,
              lineHeight: 27,
            }}
          >
            {name}
          </Text>
        ) : null}
        <Text
          style={{
            color: cloth.soft,
            fontSize: 14.5,
            lineHeight: 21,
            marginTop: 2,
          }}
        >
          {`Surah ${surah}${details ? `, ${details}` : ""}`}
        </Text>
      </View>
    </AdireCloth>
  );
}
