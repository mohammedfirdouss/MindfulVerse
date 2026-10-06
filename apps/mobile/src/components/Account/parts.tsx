// Small presentational pieces of the Account screen: web's .field,
// .notice-wash, .form-error, .link-btn and .auth-section.
import { forwardRef, type ReactNode } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { fonts, radius, space, type as scale, useTheme } from "../../theme";
import { Text } from "../../ui";

/** Labelled text input (web's .field). The label is also the input's
 *  accessibility label, so screen readers announce it on focus. */
export const Field = forwardRef<TextInput, TextInputProps & { label: string; hint?: string }>(function Field(
  { label, hint, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="eyebrow" importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.indigo}
        {...rest}
        style={[
          {
            ...scale.body,
            fontFamily: fonts.read,
            color: colors.ink,
            backgroundColor: colors.cottonRaised,
            borderWidth: 1,
            borderColor: colors.lineStrong,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            paddingVertical: 10,
            minHeight: 48,
          },
          style,
        ]}
      />
    </View>
  );
});

/** Web's .notice-wash: a calm, pale-indigo message block. Announced politely. */
export function Notice({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: colors.indigoWash, borderRadius: radius.md, padding: space.md, gap: space.sm }}
    >
      {typeof children === "string" ? <Text>{children}</Text> : children}
    </View>
  );
}

/** Web's .form-error, announced as an alert. */
export function FormError({ message }: { message: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{ color: colors.kola, fontSize: 15.5, lineHeight: 23 }}
    >
      {message}
    </Text>
  );
}

/** Web's .link-btn: inline text action. */
export function LinkButton({
  title,
  onPress,
  disabled,
  hint,
  danger,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.6 : 1, paddingVertical: 4 })}
    >
      <Text style={{ color: danger ? colors.kola : colors.indigo, textDecorationLine: "underline" }}>{title}</Text>
    </Pressable>
  );
}

/** Web's .auth-section: a ruled-off block inside the account card. */
export function Section({ title, children, aside }: { title?: string; children: ReactNode; aside?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md, gap: space.sm }}>
      {title ? (
        <Text accessibilityRole="header" style={{ fontFamily: fonts.readSemiBold }}>
          {title}
          {aside ? <Text variant="soft">{` · ${aside}`}</Text> : null}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Small print (web's `.soft` at .9rem). */
export function Small({ children }: { children: ReactNode }) {
  return (
    <Text variant="soft" style={{ fontSize: 15, lineHeight: 23 }}>
      {children}
    </Text>
  );
}
