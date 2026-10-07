// RN-only time selector (no native date-picker dependency): the reminder
// time moves in 15-minute steps like web's <input type="time" step=900>,
// with hour jumps for speed. The readout is an "adjustable" element, so
// TalkBack/VoiceOver swipe up/down moves it by 15 minutes.
import { Pressable, View } from "react-native";
import { fonts, radius, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { formatTime, shiftTime, spokenTime, TIME_STEP_MINUTES } from "./logic";

function StepButton({
  label,
  a11y,
  onPress,
  disabled,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        paddingHorizontal: space.sm,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.lineStrong,
        borderRadius: radius.sm,
        backgroundColor: pressed ? colors.indigoWash : colors.cottonRaised,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Text style={{ color: colors.indigo, fontSize: 15, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function TimeStepper({
  label,
  value,
  onChange,
  disabled,
}: {
  /** e.g. "Remind me at" — prefixes the spoken value. */
  label: string;
  value: string;
  onChange: (t: string) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const step = TIME_STEP_MINUTES;
  return (
    <View style={{ gap: space.sm }}>
      {/* Spoken as part of the adjustable readout below. */}
      <Text variant="soft" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: spokenTime(value) }}
        accessibilityState={{ disabled: !!disabled }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          if (e.nativeEvent.actionName === "increment") onChange(shiftTime(value, step));
          if (e.nativeEvent.actionName === "decrement") onChange(shiftTime(value, -step));
        }}
      >
        <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 26, lineHeight: 32, color: colors.indigoDeep }}>
          {formatTime(value)}
        </Text>
      </View>
      {/* Two pairs, earlier | later; the pairs wrap on very narrow screens. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: space.sm }}>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <StepButton label="−1 h" a11y="One hour earlier" disabled={disabled} onPress={() => onChange(shiftTime(value, -60))} />
          <StepButton
            label={`−${step} min`}
            a11y={`${step} minutes earlier`}
            disabled={disabled}
            onPress={() => onChange(shiftTime(value, -step))}
          />
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <StepButton
            label={`+${step} min`}
            a11y={`${step} minutes later`}
            disabled={disabled}
            onPress={() => onChange(shiftTime(value, step))}
          />
          <StepButton label="+1 h" a11y="One hour later" disabled={disabled} onPress={() => onChange(shiftTime(value, 60))} />
        </View>
      </View>
    </View>
  );
}
