// PLACEHOLDER: daily check-in (web: apps/web/src/pages/CheckIn.tsx). Pushed
// from Home; also the target of the daily-verse / welcome push (data.url "/checkin").
import { Screen, Text } from "../src/ui";

export default function CheckIn() {
  return (
    <Screen edges="bottom">
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Check-in</Text>
      <Text variant="soft">Route: /checkin — web CheckIn.tsx</Text>
    </Screen>
  );
}
