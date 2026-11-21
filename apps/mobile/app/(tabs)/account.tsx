import { track } from "@mindfulverse/core/analytics";
import { leaveCircle } from "@mindfulverse/core/circles";
import { SITE_ORIGIN } from "@mindfulverse/core/shareText";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { deleteAccount } from "@mindfulverse/core/sync/deleteAccount";
import {
  getSyncStatus,
  onSyncStatus,
  syncNow,
} from "@mindfulverse/core/sync/engine";
import type { SyncStatus } from "@mindfulverse/core/sync/engine";
import { insforge } from "@mindfulverse/core/sync/insforge";
// /account — optional identity (web: apps/web/src/pages/Account.tsx). The
// whole app works signed-out; an account only backs up the journal and
// progress across devices, and enables the daily verse reminder.
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  View,
} from "react-native";

import { AuthForm } from "../../src/components/Account/AuthForm";
import type { AuthMode } from "../../src/components/Account/AuthForm";
import {
  deletedCircleCodes,
  NETWORK_ERROR,
} from "../../src/components/Account/logic";
import {
  FormError,
  LinkButton,
  Notice,
  Section,
  Small,
} from "../../src/components/Account/parts";
import { ReminderSection } from "../../src/components/Account/ReminderSection";
import { SettingsSection } from "../../src/components/Account/SettingsSection";
import { SyncSection } from "../../src/components/Account/SyncSection";
import { disableLocalReminder } from "../../src/localReminder";
import {
  disableReminder,
  forgetPushToken,
  unregisterPush,
} from "../../src/push";
import { signOut as endSession } from "../../src/session";
import { fonts, space } from "../../src/theme";
import { Button, Card, Screen, Text } from "../../src/ui";

function confirm(
  title: string,
  message: string,
  action: string
): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { onPress: () => resolve(false), style: "cancel", text: "Cancel" },
        { onPress: () => resolve(true), style: "destructive", text: action },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
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
          track({ ok: s === "synced", type: "sync_done" });
        }
        prevStatus.current = s;
        setStatus(s);
      }),
    []
  );

  // After a successful sign-in / verification: same sequence as web.
  async function onSignedIn() {
    await refresh();
    await syncNow();
    // Only promise a backup once the first sync actually landed.
    setNotice(
      getSyncStatus() === "synced"
        ? "Signed in. Your journal is now backed up to your account."
        : "Signed in."
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
      if (pushError) {
        console.warn("disableReminder failed before sign-out:", pushError);
      }
    } catch {
      /* best effort — sign-out must proceed regardless */
    }
    forgetPushToken();
    // The on-device reminder too: its controls are only shown when signed in.
    // Best effort: it reports a failure instead of throwing.
    await disableLocalReminder();
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
    setNotice("Signed out. Your entries stay on this device.");
  }

  async function deleteMyData(userId: string) {
    const sure = await confirm(
      "Delete your account?",
      "This deletes your email and sign-in, your synced journal and progress, your reminders and any circles you started. It can't be undone. This device keeps its entries.",
      "Delete account"
    );
    if (!sure) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Only sign out once every delete succeeded — signing out on a partial
      // failure would strand data the user believes is gone.
      const [circles, ...results] = await Promise.all([
        // The circles this account started. Returns their codes.
        insforge.database
          .from("circles")
          .delete()
          .eq("owner_id", userId)
          .select("code"),
        insforge.database
          .from("journal_entries")
          .delete()
          .eq("user_id", userId),
        insforge.database.from("progress").delete().eq("user_id", userId),
        unregisterPush(userId), // every device's reminder for this account
      ]);
      // A deleted circle is gone for everyone, this device included.
      if (!circles.error) {
        for (const code of deletedCircleCodes(circles.data)) {
          leaveCircle(code);
        }
      }
      if (circles.error || results.some((r) => r.error)) {
        setNotice(null);
        setError("Couldn't delete everything. Please try again.");
        setBusy(false);
        return;
      }
    } catch {
      setNotice(null);
      setError(NETWORK_ERROR);
      setBusy(false);
      return;
    }
    // Then the account itself: the email and sign-in.
    if (!(await deleteAccount())) {
      setNotice(null);
      setError(
        "Your synced data is deleted, but the account couldn't be. Please try again."
      );
      setBusy(false);
      return;
    }
    await signOut();
    setNotice("Your account is deleted. Entries on this device stay here.");
  }

  const header = (
    <View>
      <Text variant="h1">
        {loading || user
          ? "Your account"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Screen>
        {header}

        {notice ? <Notice>{notice}</Notice> : null}

        {loading ? (
          <Card>
            <Text variant="soft" accessibilityLiveRegion="polite">
              Loading…
            </Text>
          </Card>
        ) : user ? (
          <Card>
            <View accessible>
              <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 19 }}>
                {user.name ?? user.email}
              </Text>
              {user.name ? <Small>{user.email}</Small> : null}
            </View>

            <SyncSection status={status} setNotice={setNotice} />
            <FormError message={error} />

            <ReminderSection />

            <Section>
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: space.md,
                }}
              >
                <Button
                  title="Sign out"
                  kind="secondary"
                  disabled={busy}
                  busy={busy}
                  onPress={() => void signOut()}
                />
                <LinkButton
                  title="Delete account"
                  danger
                  disabled={busy}
                  onPress={() => void deleteMyData(user.id)}
                  hint="Asks for confirmation, then deletes your account and synced data and signs you out"
                />
              </View>
            </Section>
          </Card>
        ) : (
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onSignedIn={onSignedIn}
            setNotice={setNotice}
          />
        )}

        <SettingsSection
          feedbackSubject={
            user ? "About my MindfulVerse account" : "Feedback on MindfulVerse"
          }
        />

        <Small>
          We anonymously count days the app is opened. Your writing stays on
          this device unless you sync.
        </Small>
        <LinkButton
          title="Privacy"
          onPress={() =>
            void Linking.openURL(`${SITE_ORIGIN}/privacy`).catch(() => {})
          }
          hint="Opens the privacy policy in your browser"
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
