import { ActivityIndicator, Pressable, type PressableProps, type ViewStyle } from "react-native";
import { fonts, radius, useTheme } from "../theme";
import { Text } from "./Text";

export type ButtonKind = "primary" | "secondary" | "ghost";

/** Web's .btn: flat indigo block, square-shouldered; .secondary is outlined,
 *  .ghost is a bare link-style action. */
export function Button({
  title,
  kind = "primary",
  busy = false,
  disabled,
  style,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  title: string;
  kind?: ButtonKind;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const filled = kind === "primary";
  const fg = filled ? colors.cottonRaised : colors.indigo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy }}
      disabled={disabled || busy}
      {...rest}
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
          borderColor: kind === "ghost" ? "transparent" : pressed && filled ? colors.indigoDeep : colors.indigo,
          backgroundColor: filled
            ? pressed
              ? colors.indigoDeep
              : colors.indigo
            : pressed && kind === "secondary"
              ? colors.indigoWash
              : "transparent",
          opacity: disabled ? 0.5 : 1,
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
