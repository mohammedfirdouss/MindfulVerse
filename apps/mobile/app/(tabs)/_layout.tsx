// Bottom tabs replace the web's desktop sidebar (spec, Phase 2).
import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { fonts, useTheme } from "../../src/theme";

// Placeholder glyphs until an icon set is chosen (screen agents may swap in
// @expo/vector-icons or SVGs; keep the tab order and names).
const glyph = (g: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18 }}>{g}</Text>;
  };

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.cottonRaised, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.read, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.cotton },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: glyph("◇") }} />
      <Tabs.Screen name="read" options={{ title: "Read", tabBarIcon: glyph("☰") }} />
      <Tabs.Screen name="journal" options={{ title: "Journal", tabBarIcon: glyph("✎") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: glyph("○") }} />
    </Tabs>
  );
}
