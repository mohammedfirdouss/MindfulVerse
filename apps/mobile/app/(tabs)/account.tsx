// PLACEHOLDER: account, sync, reminders (web: apps/web/src/pages/Account.tsx).
// Built by a screen agent with src/session.ts (signIn/signUp/verifyEmail/
// signOut) and src/push.ts (enableReminder/...).
import { useAccount } from "@mindfulverse/core/sync/auth";
import { pushSupport } from "../../src/push";
import { storageBackend } from "../../src/platform/storage";
import { Screen, Text } from "../../src/ui";

export default function Account() {
  const { user, loading } = useAccount();
  return (
    <Screen>
      <Text variant="eyebrow">Placeholder</Text>
      <Text variant="h1">Account</Text>
      <Text variant="soft">Route: /account — web Account.tsx</Text>
      <Text>{loading ? "Checking session…" : user ? `Signed in as ${user.email}` : "Signed out"}</Text>
      <Text variant="muted">Storage: {storageBackend} · Push: {pushSupport()}</Text>
    </Screen>
  );
}
