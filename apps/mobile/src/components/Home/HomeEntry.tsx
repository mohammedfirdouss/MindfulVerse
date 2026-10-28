// One row of Home's section list (web .home-entry): icon, title, description,
// chevron. Without `href` the row is inert and reads "coming soon".
import type { Href } from "expo-router";
import type { ComponentType } from "react";
import { View } from "react-native";

import { useTheme } from "../../theme";
import { LinkPressable, Text } from "../../ui";
import { ChevronIcon } from "../../ui/icons";

export function HomeEntry({
  title,
  desc,
  href,
  Icon,
}: {
  title: string;
  desc: string;
  href?: Href;
  Icon: ComponentType<{ color: string; size?: number }>;
}) {
  const { colors } = useTheme();
  const live = !!href;
  const body = (
    <>
      <View style={{ alignItems: "center", width: 28 }}>
        <Icon color={live ? colors.indigo : colors.inkFaint} size={22} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: live ? colors.ink : colors.inkFaint, fontSize: 17.8 }}
        >
          {title}
        </Text>
        <Text
          variant="muted"
          style={{ fontSize: 15.2, lineHeight: 21, marginTop: 1 }}
        >
          {desc}
        </Text>
      </View>
      {live ? (
        <ChevronIcon color={colors.indigo} />
      ) : (
        <View
          style={{
            borderColor: colors.lineStrong,
            borderRadius: 10,
            borderWidth: 1,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text variant="muted" style={{ fontSize: 12, lineHeight: 16 }}>
            Soon
          </Text>
        </View>
      )}
    </>
  );
  const row = {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingVertical: 14,
  } as const;

  if (!href) {
    return (
      <View
        accessible
        accessibilityLabel={`${title}. ${desc}. Coming soon.`}
        style={row}
      >
        {body}
      </View>
    );
  }
  return (
    <LinkPressable
      href={href}
      accessibilityLabel={`${title}. ${desc}`}
      style={({ pressed }) => [
        row,
        {
          opacity: pressed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {body}
    </LinkPressable>
  );
}

/** Spacing between rows: a hairline that starts after the icon column. */
export function HomeEntryDivider() {
  const { colors } = useTheme();
  return (
    <View
      style={{ backgroundColor: colors.line, height: 1, marginLeft: 28 + 14 }}
    />
  );
}
