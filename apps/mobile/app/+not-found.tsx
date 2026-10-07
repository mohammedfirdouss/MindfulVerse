import { router, Stack } from "expo-router";
import { Button, Screen, Text } from "../src/ui";

export default function NotFound() {
  return (
    <Screen edges="bottom">
      <Stack.Screen options={{ title: "Not found" }} />
      <Text variant="h1">Page not found</Text>
      <Button title="Go home" onPress={() => router.replace("/")} />
    </Screen>
  );
}
