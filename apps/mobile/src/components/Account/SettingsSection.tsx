import Constants from "expo-constants";
// Appearance (light / dark / follow the phone), feedback and app version.
// Shown signed in or out. Web keeps its theme toggle in the header; the app
// has no header on tabs, so it lives here.
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { radius, space, useTheme } from "../../theme";
import type { ThemePref } from "../../theme";
import { Text } from "../../ui";
import { FEEDBACK_EMAIL, feedbackMailto } from "./logic";
import { LinkButton, Section, Small } from "./parts";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Match phone", value: "system" },
];

function ThemeChoice() {
  const { colors, pref, setPref } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      style={{ flexDirection: "row", gap: space.sm }}
    >
      {OPTIONS.map((o) => {
        const selected = pref === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => setPref(o.value)}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor:
                selected || pressed ? colors.indigoWash : colors.cottonRaised,
              borderColor: selected ? colors.indigo : colors.lineStrong,
              borderRadius: radius.sm,
              borderWidth: selected ? 2 : 1,
              flex: 1,
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: space.xs,
            })}
          >
            <Text
              style={{
                color: selected ? colors.indigo : colors.inkSoft,
                fontSize: 15,
                lineHeight: 20,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsSection({
  feedbackSubject,
}: {
  feedbackSubject: string;
}) {
  const [mailFailed, setMailFailed] = useState(false);
  const version = Constants.expoConfig?.version;
  return (
    <>
      <Section title="Appearance">
        <ThemeChoice />
      </Section>
      <Section>
        <View style={{ alignItems: "flex-start" }}>
          <LinkButton
            title="Send feedback"
            hint="Opens your email app"
            onPress={() =>
              void Linking.openURL(feedbackMailto(feedbackSubject)).catch(() =>
                setMailFailed(true)
              )
            }
          />
        </View>
        {mailFailed ? (
          <Small>No email app found. Write to {FEEDBACK_EMAIL}.</Small>
        ) : null}
        {version ? <Small>MindfulVerse {version}</Small> : null}
      </Section>
    </>
  );
}
