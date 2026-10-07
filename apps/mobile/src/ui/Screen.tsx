import type { ReactNode } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, useTheme } from "../theme";
import { TopBand } from "./adire";

/** Page container: cotton ground, safe-area aware, web's .container padding
 *  (22dp sides) with a 16dp vertical rhythm between children (.stack).
 *  `scroll={false}` for screens that bring their own list (FlatList etc.).
 *  Inside a Stack screen with a header, pass `edges="bottom"`.
 *  With `edges="both"` (a tab screen) the adire band crowns the page. */
export function Screen({
  children,
  scroll = true,
  edges = "both",
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: "both" | "bottom" | "none";
  contentStyle?: ViewStyle;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: (edges === "none" ? 0 : insets.bottom) + space.xxl,
    gap: space.md,
  };
  const band = edges === "both" ? <TopBand /> : null;
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cotton }}>
        {band}
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.cotton }}>
      {band}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[padding, contentStyle]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}
