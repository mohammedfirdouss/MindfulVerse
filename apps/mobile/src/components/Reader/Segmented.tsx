import { Pressable, View } from "react-native";
import type { TextStyle } from "react-native";

import { fonts, radius, useTheme } from "../../theme";
import { Text } from "../../ui";

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
  accessibilityLabel?: string;
  labelStyle?: TextStyle;
}

/** Web's `.reading-controls` group of `.size-btn` toggles: joined outlined
 *  buttons, the pressed one filled indigo. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (k: K) => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: "row" }}
    >
      {options.map((o, i) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, selected: on }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            onPress={() => onChange(o.key)}
            hitSlop={{ bottom: 6, top: 6 }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: on
                ? colors.indigo
                : pressed
                  ? colors.indigoWash
                  : "transparent",
              borderBottomLeftRadius: i === 0 ? radius.sm : 0,
              borderBottomRightRadius: i === options.length - 1 ? radius.sm : 0,
              borderColor: on ? colors.indigo : colors.lineStrong,
              borderLeftWidth: i === 0 ? 1 : 0,
              borderTopLeftRadius: i === 0 ? radius.sm : 0,
              borderTopRightRadius: i === options.length - 1 ? radius.sm : 0,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 40,
              minWidth: 40,
              paddingHorizontal: 12,
            })}
          >
            <Text
              style={[
                {
                  color: on ? colors.cotton : colors.inkSoft,
                  fontFamily: fonts.read,
                  fontSize: 15,
                  lineHeight: 20,
                },
                o.labelStyle,
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
