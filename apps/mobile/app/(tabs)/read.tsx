// PLACEHOLDER: surah list (web: apps/web/src/pages/Reader.tsx). Built by a screen agent.
import { Link } from "expo-router";
import { ArabicText, Button, Card, Screen, Text } from "../../src/ui";

export default function Read() {
  return (
    <Screen>
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Read</Text>
      <Text variant="soft">Route: /read — web Reader.tsx</Text>
      <Card>
        <ArabicText>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</ArabicText>
        <Link href={{ pathname: "/read/[surah]", params: { surah: "1" } }} asChild>
          <Button title="Open Al-Fatiha" />
        </Link>
      </Card>
    </Screen>
  );
}
