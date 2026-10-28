// Bottom tabs replace the web's desktop sidebar (spec, Phase 2).
import { Tabs } from "expo-router";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";

import { tickSelection } from "../../src/platform/haptics";
import { fonts, useTheme } from "../../src/theme";
import {
  AccountIcon,
  HomeIcon,
  JournalIcon,
  ReadIcon,
} from "../../src/ui/icons";

type Icon = ComponentType<{ color: string; focused: boolean }>;

/** The tab's icon; the open tab's motif is filled in. */
function tabIcon(Icon: Icon) {
  return function TabIcon({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) {
    return <Icon color={String(color)} focused={focused} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.cotton },
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarLabelStyle: { fontFamily: fonts.read, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.cottonRaised,
          borderTopColor: colors.line,
        },
      }}
      screenListeners={{ tabPress: tickSelection }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: tabIcon(HomeIcon), title: "Home" }}
      />
      <Tabs.Screen
        name="read"
        options={{ tabBarIcon: tabIcon(ReadIcon), title: "Read" }}
      />
      <Tabs.Screen
        name="journal"
        options={{ tabBarIcon: tabIcon(JournalIcon), title: "Journal" }}
      />
      <Tabs.Screen
        name="account"
        options={{ tabBarIcon: tabIcon(AccountIcon), title: "Account" }}
      />
    </Tabs>
  );
}
