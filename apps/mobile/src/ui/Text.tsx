import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fonts, type Colors, type as scale, useTheme } from "../theme";

export type TextVariant = "body" | "soft" | "muted" | "eyebrow" | "h1" | "h2" | "translation";

function variantStyle(v: TextVariant, c: Colors): TextStyle {
  switch (v) {
    case "h1":
      return { ...scale.h1, fontFamily: fonts.readSemiBold, color: c.indigoDeep, letterSpacing: -0.5 };
    case "h2":
      return { ...scale.h2, fontFamily: fonts.readSemiBold, color: c.indigoDeep, letterSpacing: -0.3 };
    case "eyebrow":
      return { ...scale.small, fontFamily: fonts.readSemiBold, color: c.indigo };
    case "soft":
      return { ...scale.body, fontFamily: fonts.read, color: c.inkSoft };
    case "muted":
      return { ...scale.body, fontFamily: fonts.read, color: c.inkFaint };
    case "translation":
      return { ...scale.translation, fontFamily: fonts.read, color: c.inkSoft };
    default:
      return { ...scale.body, fontFamily: fonts.read, color: c.ink };
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
    k === 1 ? base : { ...base, fontSize: (base.fontSize ?? 17) * k, lineHeight: (base.lineHeight ?? 28) * k };
  const role = variant === "h1" || variant === "h2" ? "header" : undefined;
  return <RNText accessibilityRole={role} {...rest} style={[sized, style]} />;
}
