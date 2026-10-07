// /account — optional identity (web: apps/web/src/pages/Account.tsx). The
// whole app works signed-out; an account only backs up the journal and
// progress across devices, and enables the daily verse reminder.
import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { getSyncStatus, onSyncStatus, syncNow, type SyncStatus } from "@mindfulverse/core/sync/engine";
import { insforge } from "@mindfulverse/core/sync/insforge";
import { AuthForm, type AuthMode } from "../../src/components/Account/AuthForm";
import { NETWORK_ERROR } from "../../src/components/Account/logic";
import { FormError, LinkButton, Notice, Section, Small } from "../../src/components/Account/parts";
import { ReminderSection } from "../../src/components/Account/ReminderSection";
import { SettingsSection } from "../../src/components/Account/SettingsSection";
import { SyncSection } from "../../src/components/Account/SyncSection";
import { disableReminder, forgetPushToken, unregisterPush } from "../../src/push";
import { signOut as endSession } from "../../src/session";
import { fonts } from "../../src/theme";
import { Button, Card, Screen, Text } from "../../src/ui";

function confirm(title: string, message: string, action: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: action, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

export default function Account() {
  const { user, loading, refresh } = useAccount();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [mode, setMode] = useState<AuthMode>("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fire sync_done only when the status actually transitions to a terminal
  // state, never on every render.
  const prevStatus = useRef<SyncStatus>(status);
  useEffect(
    () =>
      onSyncStatus((s) => {
        if (s !== prevStatus.current && (s === "synced" || s === "error")) {
          track({ type: "sync_done", ok: s === "synced" });
        }
        prevStatus.current = s;
        setStatus(s);
      }),
    [],
  );

  // After a successful sign-in / verification: same sequence as web.
  async function onSignedIn() {
    await refresh();
    await syncNow();
    // Only promise a backup once the first sync actually landed.
    setNotice(
      getSyncStatus() === "synced" ? "Signed in — your journal is now backed up to your account." : "Signed in.",
    );
  }

  async function signOut() {
    setBusy(true);
    setError(null);
    // Drop this device's reminder first (as web does): once signed out, RLS no
    // longer lets us delete it, and this phone would keep receiving reminders.
    // Only this device's row: the account's other phones keep theirs.
    try {
      const { error: pushError } = await disableReminder();
      if (pushError) console.warn("disableReminder failed before sign-out:", pushError);
    } catch {
      /* best effort — sign-out must proceed regardless */
    }
    forgetPushToken();
    try {
      await endSession();
    } catch {
      /* the local session is cleared even when the server call fails */
    }
    track({ type: "account_signout" });
    try {
      await refresh();
    } catch {
      /* AccountProvider keeps its last state; the next refresh corrects it */
    }
    setBusy(false);
    setNotice("Signed out. Your entries stay on this device but are no longer backed up.");
  }

  async function deleteMyData(userId: string) {
    const sure = await confirm(
      "Delete synced data?",
      "Delete all synced data from your account? Entries on this device are kept.",
      "Delete",
    );
    if (!sure) return;
    setBusy(true);
    setError(null);
    try {
      // Only sign out once every delete succeeded — signing out on a partial
      // failure would strand data the user believes is gone.
      const results = await Promise.all([
        insforge.database.from("journal_entries").delete().eq("user_id", userId),
        insforge.database.from("progress").delete().eq("user_id", userId),
        unregisterPush(userId), // every device's reminder for this account
      ]);
      if (results.some((r) => r.error)) {
        setNotice(null);
        setError("Couldn't delete everything — please try again.");
        setBusy(false);
        return;
      }
    } catch {
      setNotice(null);
      setError(NETWORK_ERROR);
      setBusy(false);
      return;
    }
    await signOut();
  }

  const header = (
    <View>
      <Text variant="eyebrow">Account</Text>
      <Text variant="h1">{loading || user ? "Your account" : mode === "signup" ? "Create account" : "Sign in"}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Screen>
        {header}

        {notice ? <Notice>{notice}</Notice> : null}

        {loading ? (
          <Card>
            <Text variant="soft" accessibilityLiveRegion="polite">
              Loading…
            </Text>
          </Card>
        ) : !user ? (
          <AuthForm mode={mode} onModeChange={setMode} onSignedIn={onSignedIn} setNotice={setNotice} />
        ) : (
          <Card>
            <View accessible>
              <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 19 }}>{user.name ?? user.email}</Text>
              {user.name ? <Small>{user.email}</Small> : null}
            </View>

            <SyncSection status={status} setNotice={setNotice} />
            <FormError message={error} />

            <ReminderSection />

            <Section>
              <View style={{ alignItems: "flex-start" }}>
                <Button title="Sign out" kind="secondary" disabled={busy} busy={busy} onPress={() => void signOut()} />
              </View>
            </Section>

            <Section>
              <Small>
                Deleting removes your journal and progress from your account. Entries already on this device are
                kept.
              </Small>
              <View style={{ alignItems: "flex-start" }}>
                <LinkButton
                  title="Delete my data"
                  danger
                  disabled={busy}
                  onPress={() => void deleteMyData(user.id)}
                  hint="Asks for confirmation, then deletes your synced data and signs you out"
                />
              </View>
            </Section>
          </Card>
        )}

        <SettingsSection
          feedbackSubject={user ? "About my MindfulVerse account" : "Feedback on MindfulVerse"}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
