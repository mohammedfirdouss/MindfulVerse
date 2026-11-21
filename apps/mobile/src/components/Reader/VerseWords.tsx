import { loadSurahWords } from "@mindfulverse/core/data";
import type { Ayah } from "@mindfulverse/core/types";
import {
  FIRST_WORDS,
  WORD_MEANINGS_BOOK_URL,
  WORD_MEANINGS_CREDIT,
  pairWords,
} from "@mindfulverse/core/wordByWord";
import type { WordPair } from "@mindfulverse/core/wordByWord";
import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { space, useTheme } from "../../theme";
import { ArabicText, Text } from "../../ui";

/** Web's VerseWords: the verse word by word, each Arabic word over its
 *  meaning, with the authors' credit beside it. Until the meanings load, or
 *  if they can't be read, the verse shows as plain Arabic. */
export function VerseWords({ ayah }: { ayah: Ayah }) {
  const { colors } = useTheme();
  const [pairs, setPairs] = useState<WordPair[] | null>(null);
  const [allWords, setAllWords] = useState(false);

  useEffect(() => {
    let live = true;
    setPairs(null);
    setAllWords(false);
    const load = async () => {
      try {
        const words = await loadSurahWords(ayah.surah);
        if (live) {
          setPairs(pairWords(ayah.arabic, words[String(ayah.ayah)]));
        }
      } catch {
        /* the plain verse below stands in */
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [ayah.surah, ayah.ayah, ayah.arabic]);

  const frame = {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingBottom: space.md,
  };
  if (!pairs) {
    return (
      <ArabicText scale={0.74} style={frame}>
        {ayah.arabic}
      </ArabicText>
    );
  }
  const shown = allWords ? pairs : pairs.slice(0, FIRST_WORDS);
  const hidden = pairs.length - shown.length;
  return (
    <View accessibilityLabel="Word by word" style={[frame, { gap: space.md }]}>
      <View
        style={{
          columnGap: 18,
          flexDirection: "row-reverse",
          flexWrap: "wrap",
          rowGap: 14,
        }}
      >
        {shown.map((p, i) => (
          <View
            key={i}
            accessible
            accessibilityLabel={`${p.arabic}: ${p.meanings.join(", ")}`}
            style={{ alignItems: "center", maxWidth: "100%" }}
          >
            <ArabicText scale={0.8} style={{ textAlign: "center" }}>
              {p.arabic}
            </ArabicText>
            {p.meanings.map((m, j) => (
              <Text
                key={j}
                variant="soft"
                style={{
                  fontSize: 13.5,
                  lineHeight: 18,
                  maxWidth: 150,
                  textAlign: "center",
                }}
              >
                {m}
              </Text>
            ))}
          </View>
        ))}
      </View>
      {hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAllWords(true)}
          hitSlop={8}
          style={{
            alignSelf: "flex-start",
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.indigo,
              fontSize: 15,
              textDecorationLine: "underline",
            }}
          >
            Show all {pairs.length} words
          </Text>
        </Pressable>
      )}
      <Text variant="muted" style={{ fontSize: 13, lineHeight: 19 }}>
        {WORD_MEANINGS_CREDIT}
        {"\n"}
        <Text
          accessibilityRole="link"
          onPress={() =>
            void Linking.openURL(WORD_MEANINGS_BOOK_URL).catch(() => {})
          }
          style={{ color: colors.indigo, fontSize: 13, lineHeight: 19 }}
        >
          Get the book
        </Text>
      </Text>
    </View>
  );
}
