import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from "react-native";
import { tapLight } from "../platform/haptics";
import { fonts, radius, useTheme } from "../theme";
import { Text } from "./Text";

export type ButtonKind = "primary" | "secondary" | "ghost" | "cloth";

/** Web's .btn: flat indigo block, square-shouldered; .secondary is outlined,
 *  .ghost is a bare link-style action. `cloth` is the cotton button that sits
 *  on an AdireCloth panel. Primary and cloth buttons tap lightly on press. */
export function Button({
  title,
  kind = "primary",
  busy = false,
  disabled,
  style,
  onPress,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  title: string;
  kind?: ButtonKind;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const { colors, scheme } = useTheme();
  const filled = kind === "primary";
  const cloth = kind === "cloth";
  // On night cloth a cotton button would read as a dark slab: use the light indigo instead.
  const clothFace = scheme === "dark" ? colors.indigo : colors.cottonRaised;
  const clothText = scheme === "dark" ? colors.cotton : colors.indigoDeep;
  // A disabled filled button becomes an empty outline: clearly off, no new colour
  // (half-strength indigo over cotton reads as a muddy violet).
  const off = !!disabled && !busy && (filled || cloth);
  const fg = off ? colors.inkFaint : filled ? colors.cottonRaised : cloth ? clothText : colors.indigo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy }}
      disabled={disabled || busy}
      {...rest}
      onPress={(e) => {
        if (filled || cloth) tapLight();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 48,
          paddingVertical: 12,
          paddingHorizontal: kind === "ghost" ? 4 : 22,
          borderWidth: 2,
          borderRadius: radius.sm,
          borderColor: off
            ? colors.lineStrong
            : kind === "ghost"
              ? "transparent"
              : cloth
                ? clothFace
                : pressed && filled
                  ? colors.indigoDeep
                  : colors.indigo,
          backgroundColor: off
            ? "transparent"
            : cloth
              ? pressed
                ? scheme === "dark"
                  ? colors.indigoDeep
                  : colors.indigoWash
                : clothFace
              : filled
                ? pressed
                  ? colors.indigoDeep
                  : colors.indigo
                : pressed && kind === "secondary"
                  ? colors.indigoWash
                  : "transparent",
          opacity: disabled && !off ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: fonts.read, fontSize: 17, lineHeight: 22 }}>{title}</Text>
    </Pressable>
  );
}
