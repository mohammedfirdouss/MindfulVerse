// Choose a circle's verses for this week: the whole surah or one of its
// passages, in a sheet (web: the "This week" select).
import { FlatList, Pressable } from "react-native";

import { radius, space, useTheme } from "../../theme";
import { Sheet, Text } from "../../ui";
import { IndexDivider } from "../Reader/IndexRows";
import type { PortionChoice } from "./circleModel";

export function PortionPicker({
  choices,
  selected,
  onPick,
  onClose,
}: {
  choices: PortionChoice[];
  selected: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet
      label="Choose this week’s verses"
      title="This week"
      onClose={onClose}
    >
      <FlatList
        data={choices}
        keyExtractor={(c) => c.value || "whole"}
        initialNumToRender={12}
        ItemSeparatorComponent={IndexDivider}
        contentContainerStyle={{
          paddingBottom: space.lg,
          paddingHorizontal: space.lg,
        }}
        renderItem={({ item }) => {
          const chosen = item.value === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              accessibilityLabel={item.label}
              onPress={() => onPick(item.value)}
              style={({ pressed }) => ({
                backgroundColor:
                  pressed || chosen ? colors.indigoWash : "transparent",
                borderRadius: radius.md,
                justifyContent: "center",
                marginHorizontal: -space.sm,
                minHeight: 56,
                paddingHorizontal: space.sm,
                paddingVertical: 10,
              })}
            >
              <Text style={{ fontSize: 16.5, lineHeight: 24 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </Sheet>
  );
}
