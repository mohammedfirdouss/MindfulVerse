// PLACEHOLDER: surah reader (web: apps/web/src/pages/Surah.tsx). Built by a screen agent.
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { loadSurahAyahs } from "@mindfulverse/core/data";
import { ArabicText, Screen, Text } from "../../src/ui";

export default function SurahReader() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const n = Number(surah);
  // Proves the bundled-data path end to end: first ayah of this surah.
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadSurahAyahs(n)
      .then((ayahs) => setFirst(ayahs[0]?.arabic ?? null))
      .catch((e: unknown) => setError(String(e)));
  }, [n]);
  return (
    <Screen edges="bottom">
      <Stack.Screen options={{ title: `Surah ${surah}` }} />
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Surah {surah}</Text>
      <Text variant="soft">Route: /read/{surah} — web Surah.tsx</Text>
      {first ? <ArabicText>{first}</ArabicText> : null}
      {error ? <Text variant="muted">{error}</Text> : null}
    </Screen>
  );
}
