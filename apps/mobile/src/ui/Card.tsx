import { View } from "react-native";
import type { ViewProps } from "react-native";

import { radius, space, useTheme } from "../theme";

/** Web's .card: flat shea block, no border, no shadow. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.shea,
          borderRadius: radius.md,
          gap: space.md,
          padding: space.lg,
        },
        style,
      ]}
    />
  );
}
