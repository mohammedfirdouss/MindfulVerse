import { useState } from "react";
import { TextInput, View } from "react-native";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button } from "../../ui";

/** Web's "Verse [ ] Go" form. Keeps its own input state so typing doesn't
 *  re-render the verse list. */
export function JumpToVerse({ max, onJump }: { max: number; onJump: (n: number) => void }) {
  const { colors } = useTheme();
  const [value, setValue] = useState("");
  function go() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) return;
    onJump(n);
  }
  return (
    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
      <TextInput
        value={value}
        onChangeText={(t) => setValue(t.replace(/\D/g, ""))}
        onSubmitEditing={go}
        keyboardType="number-pad"
        returnKeyType="go"
        maxLength={3}
        placeholder="Verse"
        placeholderTextColor={colors.inkFaint}
        accessibilityLabel="Jump to verse number"
        accessibilityHint={`1 to ${max}`}
        style={{
          width: 84,
          minHeight: 44,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.md,
          backgroundColor: colors.cottonRaised,
          color: colors.ink,
          fontFamily: fonts.read,
          fontSize: 16,
        }}
      />
      <Button
        title="Go"
        kind="secondary"
        onPress={go}
        accessibilityLabel="Go to verse"
        style={{ minHeight: 44, paddingVertical: 6, paddingHorizontal: 16 }}
      />
    </View>
  );
}
