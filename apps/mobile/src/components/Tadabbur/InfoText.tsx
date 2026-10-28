// The surah's background text (Ibn Kathir's introduction), shown first.
// It opens on its first section only (a few lines) so the way in stays near
// the top; "Read more" unfolds the rest and "Show less" folds it back.
import { useMemo, useState } from "react";
import { View } from "react-native";

import { fonts, radius, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { ActionLink } from "../Reader/ActionLink";
import { aboutExcerpt, infoBlocks } from "./logic";

const EXCERPT_LINES = 4;

export function InfoText({ text }: { text: string }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const all = useMemo(() => infoBlocks(text, true).blocks, [text]);
  const excerpt = useMemo(() => aboutExcerpt(all), [all]);
  const blocks = expanded ? all : all.slice(0, excerpt.count);

  return (
    <View
      style={{
        backgroundColor: colors.cottonRaised,
        borderColor: colors.line,
        borderRadius: radius.md,
        borderWidth: 1,
        gap: space.sm + 4,
        paddingHorizontal: space.lg,
        paddingVertical: space.md + 2,
      }}
    >
      <Text variant="eyebrow" accessibilityRole="header">
        About this surah
      </Text>
      <View style={{ gap: space.sm + 4 }}>
        {blocks.map((b, i) =>
          b.kind === "heading" ? (
            <Text
              key={i}
              accessibilityRole="header"
              style={{
                color: colors.indigoDeep,
                fontFamily: fonts.readSemiBold,
                marginTop: i ? space.sm : 0,
              }}
            >
              {b.text}
            </Text>
          ) : (
            <Text
              key={i}
              variant="soft"
              numberOfLines={
                !expanded && excerpt.clamp && i === blocks.length - 1
                  ? EXCERPT_LINES
                  : undefined
              }
            >
              {b.text}
            </Text>
          )
        )}
      </View>
      {excerpt.more ? (
        <View style={{ alignItems: "flex-start" }}>
          <ActionLink
            title={expanded ? "Show less" : "Read more"}
            accessibilityHint={
              expanded
                ? "Shows only the start of the introduction"
                : "Shows the rest of the introduction"
            }
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((e) => !e)}
          />
        </View>
      ) : null}
    </View>
  );
}
