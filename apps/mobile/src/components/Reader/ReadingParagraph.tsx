import { memo } from "react";
import { Text as RNText } from "react-native";
import { toArabicDigits } from "@mindfulverse/core/divisions";
import type { Ayah } from "@mindfulverse/core/types";
import { type as typeScale, useTheme } from "../../theme";
import { ArabicText } from "../../ui";
import type { ReadingChunk } from "./chunks";

/** Reading view: one paragraph of flowing Arabic (web ReadingText's
 *  `.reading-text`), each ayah closed by its Arabic-Indic number. Tapping a
 *  verse selects it. Nested <Text> spans keep it one shaped paragraph; no
 *  letterSpacing anywhere. `activeAyah` is the selected/flashed verse, if it
 *  falls in this paragraph, so only that row re-renders. */
export const ReadingParagraph = memo(function ReadingParagraph({
  chunk,
  scale,
  activeAyah,
  onSelect,
}: {
  chunk: ReadingChunk;
  scale: number;
  activeAyah: number | null;
  onSelect: (a: Ayah) => void;
}) {
  const { colors } = useTheme();
  return (
    <ArabicText
      scale={scale}
      accessibilityHint="Tap a verse to see its translation and commentary"
      style={{
        // web .reading-text: line-height 2.5, justified, last line at start
        lineHeight: typeScale.arabic.fontSize * 2.5 * scale,
        textAlign: "justify",
      }}
    >
      {chunk.ayahs.map((a) => (
        <RNText
          key={a.verseKey}
          onPress={() => onSelect(a)}
          suppressHighlighting
          style={a.ayah === activeAyah ? { backgroundColor: colors.indigoWash } : undefined}
        >
          {a.arabic}
          {/* no-break space keeps the number on the verse's last line (web: nowrap) */}
          {" "}
          <RNText style={{ color: colors.indigo }}>{toArabicDigits(a.ayah)}</RNText>
          {a.ayah === chunk.last ? "" : " "}
        </RNText>
      ))}
    </ArabicText>
  );
});
