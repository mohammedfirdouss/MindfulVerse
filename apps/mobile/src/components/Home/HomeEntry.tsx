// One row of Home's section list (web .home-entry): title, description, arrow.
// Without `href` the row is inert and reads "coming soon" (deferred screens).
import { Link, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { space, useTheme } from "../../theme";
import { Text } from "../../ui";

export function HomeEntry({ title, desc, href }: { title: string; desc: string; href?: Href }) {
  const { colors } = useTheme();
  const body = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.md,
        paddingVertical: 14,
        paddingLeft: pressed ? space.sm : 2,
        paddingRight: 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17.8, color: href ? colors.ink : colors.inkFaint }}>{title}</Text>
        <Text variant="muted" style={{ fontSize: 15.6, lineHeight: 22, marginTop: 2 }}>
          {desc}
        </Text>
      </View>
      {href ? (
        <Text aria-hidden style={{ color: colors.indigo, fontSize: 18.7 }}>
          →
        </Text>
      ) : (
        <Text variant="muted" style={{ fontSize: 13 }}>
          Coming soon
        </Text>
      )}
    </View>
  );

  if (!href) {
    return (
      <View accessible accessibilityLabel={`${title}. ${desc}. Coming soon.`}>
        {body(false)}
      </View>
    );
  }
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${title}. ${desc}`}>
        {({ pressed }) => body(pressed)}
      </Pressable>
    </Link>
  );
}
