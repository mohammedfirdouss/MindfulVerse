// "See how others felt" on the surah end screen (web's FeelingCloud): reveals
// the anonymous feelings cloud. Too-few and offline are calm notes, never
// errors, and nothing here can block the end screen.
import {
  CLOUD_COPY,
  cloudFontSize,
  cloudWordLabel,
  fetchFeelingCloud,
} from "@mindfulverse/core/feelingCloud";
import type { FeelingCloud as Cloud } from "@mindfulverse/core/feelingCloud";
import { useState } from "react";
import { View } from "react-native";

import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";

const MIN_FONT = 15;
const MAX_FONT = 34;
const LINE_RATIO = 1.25;

type CloudView = "closed" | "loading" | Cloud;

export function FeelingCloud({ surah }: { surah: number }) {
  const { colors } = useTheme();
  const [view, setView] = useState<CloudView>("closed");

  async function load() {
    setView("loading");
    setView(await fetchFeelingCloud(surah));
  }

  if (view === "closed") {
    return (
      <View style={{ alignItems: "flex-start" }}>
        <Button
          kind="ghost"
          title={CLOUD_COPY.reveal}
          onPress={() => void load()}
        />
      </View>
    );
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colors.cottonRaised,
        borderColor: colors.line,
        borderRadius: radius.md,
        borderWidth: 1,
        gap: space.sm,
        padding: space.md,
      }}
    >
      <Text variant="eyebrow" accessibilityRole="header">
        {CLOUD_COPY.title}
      </Text>
      {view === "loading" ? (
        <Text variant="muted" style={{ fontSize: 15 }}>
          Loading…
        </Text>
      ) : null}
      {view === "too-few" ? (
        <Text variant="muted" style={{ fontSize: 15, lineHeight: 22 }}>
          {CLOUD_COPY.tooFew}
        </Text>
      ) : null}
      {view === "offline" ? (
        <View style={{ alignItems: "flex-start", gap: space.xs }}>
          <Text variant="muted" style={{ fontSize: 15, lineHeight: 22 }}>
            {CLOUD_COPY.offline}
          </Text>
          <Button
            kind="ghost"
            title={CLOUD_COPY.retry}
            onPress={() => void load()}
          />
        </View>
      ) : null}
      {Array.isArray(view) ? (
        <View
          style={{
            alignItems: "baseline",
            columnGap: 18,
            flexDirection: "row",
            flexWrap: "wrap",
            rowGap: 6,
          }}
        >
          {view.map((t, i) => {
            const size = cloudFontSize(t.readers, view, MIN_FONT, MAX_FONT);
            return (
              <Text
                key={t.feeling}
                accessibilityLabel={cloudWordLabel(t)}
                style={{
                  color: i % 2 === 0 ? colors.indigoDeep : colors.indigo,
                  fontFamily: fonts.readMedium,
                  fontSize: size,
                  lineHeight: Math.round(size * LINE_RATIO),
                }}
              >
                {t.feeling}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
