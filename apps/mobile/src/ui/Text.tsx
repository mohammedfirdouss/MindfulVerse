import { Text as RNText } from "react-native";
import type { TextProps, TextStyle } from "react-native";

import { fonts, type as scale, useTheme } from "../theme";
import type { Colors } from "../theme";

export type TextVariant =
  | "body"
  | "soft"
  | "muted"
  | "eyebrow"
  | "h1"
  | "h2"
  | "translation";

function variantStyle(v: TextVariant, c: Colors): TextStyle {
  switch (v) {
    case "h1": {
      return {
        ...scale.h1,
        color: c.indigoDeep,
        fontFamily: fonts.readSemiBold,
        letterSpacing: -0.8,
      };
    }
    case "h2": {
      return {
        ...scale.h2,
        color: c.indigoDeep,
        fontFamily: fonts.readSemiBold,
        letterSpacing: -0.3,
      };
    }
    case "eyebrow": {
      return {
        ...scale.small,
        color: c.indigo,
        fontFamily: fonts.readSemiBold,
      };
    }
    case "soft": {
      return { ...scale.body, color: c.inkSoft, fontFamily: fonts.read };
    }
    case "muted": {
      return { ...scale.body, color: c.inkFaint, fontFamily: fonts.read };
    }
    case "translation": {
      return { ...scale.translation, color: c.inkSoft, fontFamily: fonts.text };
    }
    default: {
      return { ...scale.body, color: c.ink, fontFamily: fonts.read };
    }
  }
}

/** Latin text in Fraunces. `variant` mirrors the web's h1/h2/.eyebrow/.soft/
 *  .muted/.translation; `scale` multiplies size for the reader's A/A/A control. */
export function Text({
  variant = "body",
  scale: k = 1,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; scale?: number }) {
  const { colors } = useTheme();
  const base = variantStyle(variant, colors);
  const sized =
    k === 1
      ? base
      : {
          ...base,
          fontSize: (base.fontSize ?? 17) * k,
          lineHeight: (base.lineHeight ?? 28) * k,
        };
  const role = variant === "h1" || variant === "h2" ? "header" : undefined;
  return <RNText accessibilityRole={role} {...rest} style={[sized, style]} />;
}
