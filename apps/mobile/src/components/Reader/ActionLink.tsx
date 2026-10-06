import { Pressable, type PressableProps } from "react-native";
import { fonts, useTheme } from "../../theme";
import { Text } from "../../ui";

/** Web's `.commentary-open`: a bare kola-coloured text action under a verse. */
export function ActionLink({
  title,
  disabled,
  ...rest
}: Omit<PressableProps, "children"> & { title: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={10}
      {...rest}
    >
      {({ pressed }) => (
        <Text
          style={{
            fontFamily: fonts.read,
            fontSize: 16,
            lineHeight: 24,
            color: disabled ? colors.inkFaint : colors.kola,
            textDecorationLine: pressed && !disabled ? "underline" : "none",
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
