import "../src/setup"; // MUST stay first: installs shims + configures core (F4)

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trackAppOpen } from "@mindfulverse/core/analytics";
import { recordVisit } from "@mindfulverse/core/progress";
import { AccountProvider, useAccount } from "@mindfulverse/core/sync/auth";
import { initSync } from "@mindfulverse/core/sync/engine";
import { AppState } from "react-native";
import { useNotificationRouting } from "../src/notifications";
import { onSessionChange, restore } from "../src/session";
import { fonts, ThemeProvider, useTheme } from "../src/theme";

void SplashScreen.preventAutoHideAsync();

// Same once-per-launch bookkeeping as web's main.tsx.
trackAppOpen();
recordVisit();
AppState.addEventListener("change", (s) => {
  if (s === "active") recordVisit(); // idempotent per day
});

// Session restore starts immediately, in parallel with font loading.
const restored = restore().then(() => initSync());

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.arabic]: require("../assets/fonts/uthmanic-hafs.ttf"),
    [fonts.read]: require("../assets/fonts/fraunces-regular.ttf"),
    [fonts.readSemiBold]: require("../assets/fonts/fraunces-semibold.ttf"),
  });
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    void restored.finally(() => setSessionReady(true));
  }, []);

  const ready = (fontsLoaded || !!fontError) && sessionReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // native splash stays up

  // AccountProvider mounts only after restore(), so its first
  // getCurrentUser() already carries the restored access token.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AccountProvider>
          <SessionBridge />
          <RootNavigator />
        </AccountProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Re-reads the account when session.ts changes state on its own
 *  (a late restore, or a refresh that found the session revoked). */
function SessionBridge() {
  const { refresh } = useAccount();
  useEffect(() => onSessionChange(() => void refresh()), [refresh]);
  return null;
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  useNotificationRouting();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.cotton },
          headerTintColor: colors.indigo,
          headerTitleStyle: { fontFamily: fonts.readSemiBold, color: colors.indigoDeep },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.cotton },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="read/[surah]" options={{ title: "" }} />
        <Stack.Screen name="tadabbur/[surah]" options={{ title: "Tadabbur" }} />
        <Stack.Screen name="checkin" options={{ title: "Check-in" }} />
      </Stack>
    </>
  );
}
