import { memo } from "react";
import { View } from "react-native";
import type { Division, SurahMeta } from "@mindfulverse/core/types";
import { fonts, radius, space, useTheme } from "../../theme";
import { arabicSurahName, revelationPlace } from "@mindfulverse/core/surahNames";
import { ArabicText, Diamond, LinkPressable, Text } from "../../ui";

/** href for "surah s from ayah a": no ?v= when it starts at the top. */
export function verseHref(surah: number, ayah: number) {
  return ayah > 1
    ? ({ pathname: "/read/[surah]", params: { surah: String(surah), v: String(ayah) } } as const)
    : ({ pathname: "/read/[surah]", params: { surah: String(surah) } } as const);
}

/** One surah in the index: diamond numeral, name and place of revelation,
 *  the Arabic name on the right. */
export const SurahRow = memo(function SurahRow({ surah }: { surah: SurahMeta }) {
  const { colors } = useTheme();
  const ayahs = `${surah.ayahCount} ${surah.ayahCount === 1 ? "ayah" : "ayahs"}`;
  const place = revelationPlace(surah.number);
  const arabic = arabicSurahName(surah.number);
  return (
    <LinkPressable
      href={verseHref(surah.number, 1)}
      accessibilityLabel={`Surah ${surah.number}, ${surah.name}, ${place ? `${place}, ` : ""}${ayahs}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: space.sm,
        marginHorizontal: -space.sm,
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.indigoWash : "transparent",
      })}
    >
      <Diamond label={surah.number} size={40} tone="outline" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 17.5, lineHeight: 24 }}>{surah.name}</Text>
        <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
          {place ? `${place} · ` : ""}
          {ayahs}
        </Text>
      </View>
      {arabic ? (
        <ArabicText
          importantForAccessibility="no"
          accessibilityElementsHidden
          numberOfLines={1}
          style={{ fontSize: 22, lineHeight: 40, color: colors.indigoDeep, flexShrink: 0, maxWidth: "40%" }}
        >
          {arabic}
        </ArabicText>
      ) : null}
    </LinkPressable>
  );
});

/** The hairline between index rows, starting under the text. */
export function IndexDivider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line, marginLeft: 54 }} />;
}

function split(key: string): [number, number] {
  const [s, a] = key.split(":").map(Number);
  return [s, a];
}

/** One juz (web Reader.tsx juz card). Web opens a juz page; that page is out
 *  of v1 scope on native, so the juz and its hizbs open the surah reader at
 *  their first verse. */
export const JuzRow = memo(function JuzRow({
  juz,
  hizbs,
  nameOf,
}: {
  juz: Division;
  hizbs: Division[];
  nameOf: (surah: number) => string;
}) {
  const { colors } = useTheme();
  const [fs, fa] = split(juz.first);
  const [ls, la] = split(juz.last);
  const range = `${nameOf(fs)} ${fa} – ${nameOf(ls)} ${la}`;
  return (
    <View style={{ paddingVertical: 12 }}>
      <LinkPressable
        href={verseHref(fs, fa)}
        accessibilityLabel={`Juz ${juz.n}, ${range}`}
        style={({ pressed }) => ({
          paddingVertical: 4,
          paddingHorizontal: space.sm,
          marginHorizontal: -space.sm,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.indigoWash : "transparent",
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Diamond label={juz.n} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 17.5, lineHeight: 24 }}>Juz {juz.n}</Text>
            <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
              {range}
            </Text>
          </View>
        </View>
        {juz.opening ? (
          <ArabicText scale={0.7} numberOfLines={1} importantForAccessibility="no" style={{ marginLeft: 54 }}>
            {juz.opening}
          </ArabicText>
        ) : null}
      </LinkPressable>
      <View style={{ flexDirection: "row", gap: space.sm, marginLeft: 54, marginTop: 2 }}>
        {hizbs.map((h) => {
          const [hs, ha] = split(h.first);
          return (
            <LinkPressable
              key={h.n}
              href={verseHref(hs, ha)}
              accessibilityLabel={`Hizb ${h.n}`}
              hitSlop={6}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.lineStrong,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: pressed ? colors.indigoWash : colors.cottonRaised,
              })}
            >
              <Text style={{ color: colors.indigo, fontSize: 14, lineHeight: 19 }}>Hizb {h.n}</Text>
            </LinkPressable>
          );
        })}
      </View>
    </View>
  );
});
