// PLACEHOLDER: surah tadabbur (web: apps/web/src/pages/SurahTadabbur.tsx).
// The reminder push lands here: data.url = "/tadabbur/{surah}?v={ayah}".
import { useLocalSearchParams } from "expo-router";
import { Screen, Text } from "../../src/ui";

export default function Tadabbur() {
  const { surah, v } = useLocalSearchParams<{ surah: string; v?: string }>();
  return (
    <Screen edges="bottom">
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Tadabbur — surah {surah}</Text>
      <Text variant="soft">Route: /tadabbur/{surah}?v= — web SurahTadabbur.tsx</Text>
      <Text>Resume at ayah: {v ?? "(none)"}</Text>
    </Screen>
  );
}
