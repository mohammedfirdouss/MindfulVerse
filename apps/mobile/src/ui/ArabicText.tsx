import { Text as RNText, type TextProps } from "react-native";
import { fonts, type as scale, useTheme } from "../theme";

/** Qur'anic Arabic in KFGQPC Uthmanic Hafs.
 *
 *  - Right-aligned, RTL. Android derives paragraph direction from the first
 *    strong character (Arabic → RTL); writingDirection covers iOS.
 *  - lineHeight is 2.3× the font size (web's .arabic): stacked tashkeel and
 *    the tall Hafs marks get clipped at tighter line heights.
 *  - No letterSpacing, ever: it breaks Arabic joining/shaping.
 *  - includeFontPadding stays on (Android default) for the same clipping reason.
 *  `scale` follows the reader size control (readingPrefs.scaleFor). */
export function ArabicText({ scale: k = 1, style, ...rest }: TextProps & { scale?: number }) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: fonts.arabic,
          fontSize: scale.arabic.fontSize * k,
          lineHeight: scale.arabic.lineHeight * k,
          color: colors.indigoDeep,
          textAlign: "right",
          writingDirection: "rtl",
        },
        style,
      ]}
    />
  );
}
