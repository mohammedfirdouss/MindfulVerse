// PLACEHOLDER: Home (web: apps/web/src/pages/Home.tsx). Built by a screen agent.
import { Link } from "expo-router";
import { Button, Card, Screen, Text } from "../../src/ui";

export default function Home() {
  return (
    <Screen>
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Home</Text>
      <Text variant="soft">Route: / — web Home.tsx</Text>
      <Card>
        <Text>Daily verse, continue reading, check-in prompt go here.</Text>
        <Link href="/checkin" asChild>
          <Button title="Daily check-in" />
        </Link>
        <Link href={{ pathname: "/tadabbur/[surah]", params: { surah: "2", v: "255" } }} asChild>
          <Button kind="secondary" title="Tadabbur 2:255 (reminder target)" />
        </Link>
      </Card>
    </Screen>
  );
}
