import { memo } from "react";
import { View } from "react-native";
import type { Division, SurahMeta } from "@mindfulverse/core/types";
import { fonts, radius, space, useTheme } from "../../theme";
import { ArabicText, LinkPressable, Text } from "../../ui";

/** href for "surah s from ayah a": no ?v= when it starts at the top. */
export function verseHref(surah: number, ayah: number) {
  return ayah > 1
    ? ({ pathname: "/read/[surah]", params: { surah: String(surah), v: String(ayah) } } as const)
    : ({ pathname: "/read/[surah]", params: { surah: String(surah) } } as const);
}

function useCardStyle() {
  const { colors } = useTheme();
  return ({ pressed }: { pressed: boolean }) => ({
    backgroundColor: pressed ? colors.indigoWash : colors.shea,
    borderRadius: radius.md,
    padding: space.lg,
  });
}

/** One surah in the index (web Reader.tsx surah card). */
export const SurahRow = memo(function SurahRow({ surah }: { surah: SurahMeta }) {
  const card = useCardStyle();
  const ayahs = `${surah.ayahCount} ${surah.ayahCount === 1 ? "ayah" : "ayahs"}`;
  return (
    <LinkPressable
      href={verseHref(surah.number, 1)}
      accessibilityLabel={`Surah ${surah.number}, ${surah.name}, ${ayahs}`}
      style={(s) => [card(s), { flexDirection: "row", alignItems: "center", gap: 14 }]}
    >
      <Text variant="eyebrow" style={{ minWidth: 36, textAlign: "center" }}>
        {surah.number}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.readSemiBold }}>{surah.name}</Text>
        <Text variant="muted" style={{ fontSize: 15, lineHeight: 22 }}>
          {ayahs}
        </Text>
      </View>
    </LinkPressable>
  );
});

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
  const card = useCardStyle();
  const [fs, fa] = split(juz.first);
  const [ls, la] = split(juz.last);
  const range = `${nameOf(fs)} ${fa} – ${nameOf(ls)} ${la}`;
  return (
    <View style={{ backgroundColor: colors.shea, borderRadius: radius.md }}>
      <LinkPressable
        href={verseHref(fs, fa)}
        accessibilityLabel={`Juz ${juz.n}, ${range}`}
        style={(s) => [card(s), { flexDirection: "row", alignItems: "center", gap: 14, paddingBottom: space.sm }]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.readSemiBold }}>Juz {juz.n}</Text>
          <Text variant="muted" style={{ fontSize: 15, lineHeight: 22 }}>
            {range}
          </Text>
        </View>
        {juz.opening ? (
          <ArabicText
            scale={0.62}
            numberOfLines={1}
            style={{ flexShrink: 0, maxWidth: "45%" }}
            importantForAccessibility="no"
          >
            {juz.opening}
          </ArabicText>
        ) : null}
      </LinkPressable>
      <View style={{ flexDirection: "row", gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md }}>
        {hizbs.map((h) => {
          const [hs, ha] = split(h.first);
          return (
            <LinkPressable key={h.n} href={verseHref(hs, ha)} accessibilityLabel={`Hizb ${h.n}`} hitSlop={10}>
              <Text style={{ color: colors.indigo, fontSize: 15.5, lineHeight: 24 }}>Hizb {h.n}</Text>
            </LinkPressable>
          );
        })}
      </View>
    </View>
  );
});
