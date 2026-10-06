// PLACEHOLDER: journal (web: apps/web/src/pages/Journal.tsx). Built by a screen agent.
import { getEntries } from "@mindfulverse/core/journal";
import { Screen, Text } from "../../src/ui";

export default function Journal() {
  const count = getEntries().length; // core reads MMKV synchronously
  return (
    <Screen>
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Journal</Text>
      <Text variant="soft">Route: /journal — web Journal.tsx</Text>
      <Text>{count} entries on this device.</Text>
    </Screen>
  );
}
