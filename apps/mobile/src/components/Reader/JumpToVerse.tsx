import { useState } from "react";
import { TextInput, View } from "react-native";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";

/** The "Go to a verse" sheet body: number field + Go (the keyboard's Go key
 *  submits too). Keeps its own input state so typing doesn't re-render the
 *  verse list. Out-of-range numbers stay put with a quiet hint. */
export function JumpToVerse({ max, onJump }: { max: number; onJump: (n: number) => void }) {
  const { colors } = useTheme();
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  function go() {
    const n = Number(value);
    if (!value || !Number.isInteger(n) || n < 1 || n > max) {
      setHint(`This surah has verses 1 to ${max}.`);
      return;
    }
    onJump(n);
  }
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
        Verse number
      </Text>
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
        <TextInput
          value={value}
          onChangeText={(t) => {
            setValue(t.replace(/\D/g, ""));
            setHint("");
          }}
          onSubmitEditing={go}
          autoFocus
          keyboardType="number-pad"
          returnKeyType="go"
          maxLength={3}
          placeholder={`1–${max}`}
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Verse number"
          accessibilityHint={`1 to ${max}`}
          style={{
            width: 120,
            minHeight: 48,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.lineStrong,
            borderRadius: radius.md,
            backgroundColor: colors.cotton,
            color: colors.ink,
            fontFamily: fonts.read,
            fontSize: 18,
          }}
        />
        <Button
          title="Go"
          onPress={go}
          accessibilityLabel="Go to verse"
          style={{ minHeight: 48, paddingVertical: 8, paddingHorizontal: 22 }}
        />
      </View>
      <Text
        variant="muted"
        accessibilityLiveRegion="polite"
        accessibilityRole={hint ? "alert" : undefined}
        style={{ fontSize: 14, lineHeight: 20, minHeight: 20 }}
      >
        {hint}
      </Text>
    </View>
  );
}
