// A circle's invite link: join the circle on this device, then open its surah
// at the focus verse. It arrives as mindfulverse://circle/abc234 or as the
// shared https://mindfulverse.app/circle/abc234 (older invites use
// mindfulverse.vercel.app, and app.json claims both hosts); expo-router maps
// them all to this route with the code as the param. The https link only opens the app
// once the website serves assetlinks.json for this package (app.json has the
// intent filter); until then it opens the website. Old numeric links
// (/circle/94) still just remember the surah. A device already in three other
// circles is asked to leave one first. Anything else goes Home.
import {
  circlesFull,
  fetchCircle,
  joinCircle,
  leaveCircle,
} from "@mindfulverse/core/circles";
import { setCircleSurah } from "@mindfulverse/core/circleSurah";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { resolveCircleLink } from "../../src/components/Circles/circleModel";
import { space, useTheme } from "../../src/theme";
import { Button, Text } from "../../src/ui";

const deps = {
  fetch: fetchCircle,
  full: circlesFull,
  join: joinCircle,
  leave: leaveCircle,
  setSurah: setCircleSurah,
};

export default function CircleLink() {
  const { colors } = useTheme();
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const [failure, setFailure] = useState<{
    message: string;
    retry: boolean;
    full: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailure(null);
    void resolveCircleLink(surah, deps).then((target) => {
      if (!alive) {
        return;
      }
      if (target.kind === "failed") {
        setFailure({
          full: false,
          message: target.message,
          retry: target.retry,
        });
        return;
      }
      if (target.kind === "full") {
        setFailure({ full: true, message: target.message, retry: false });
        return;
      }
      if (target.kind === "home") {
        router.replace("/");
        return;
      }
      router.replace({
        params:
          target.verse === null
            ? { surah: String(target.surah) }
            : { surah: String(target.surah), v: String(target.verse) },
        pathname: "/tadabbur/[surah]",
      });
    });
    return () => {
      alive = false;
    };
  }, [surah, attempt]);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.cotton,
        flex: 1,
        gap: space.md,
        justifyContent: "center",
        padding: space.lg,
      }}
    >
      {failure ? (
        <>
          <Text
            variant="soft"
            accessibilityRole="alert"
            style={{ textAlign: "center" }}
          >
            {failure.message}
          </Text>
          {failure.full ? (
            <Button
              title="Go to Circles"
              onPress={() => router.replace("/circles")}
            />
          ) : null}
          {failure.retry ? (
            <Button
              title="Try again"
              onPress={() => setAttempt((n) => n + 1)}
            />
          ) : null}
          <Button
            kind="ghost"
            title="Go to Home"
            onPress={() => router.replace("/")}
          />
        </>
      ) : (
        <View accessible accessibilityLabel="Opening your circle">
          <ActivityIndicator color={colors.indigo} />
        </View>
      )}
    </View>
  );
}
