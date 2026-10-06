// Daily verse reminder: enable at a chosen time, change the time, turn off.
// Ported from web's Account.tsx over src/push.ts (same results). Native
// differences: no "install to Home Screen" / unsupported-browser branches;
// instead "no-project" (this build can't register for push yet) and a
// permission the OS will no longer prompt for (only Settings can fix it).
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, View } from "react-native";
import * as Notifications from "expo-notifications";
import { track } from "@mindfulverse/core/analytics";
import { disableReminder, enableReminder, getReminder, pushSupport, updateReminderTime } from "../../push";
import { space } from "../../theme";
import { Button } from "../../ui";
import { DEFAULT_REMINDER_TIME, notificationsBlocked } from "./logic";
import { FormError, LinkButton, Section, Small } from "./parts";
import { TimeStepper } from "./TimeStepper";

const NOT_ALLOWED = "Notifications were not allowed."; // push.ts's message for a refused prompt

async function permissionBlocked(): Promise<boolean> {
  try {
    return notificationsBlocked(await Notifications.getPermissionsAsync());
  } catch {
    return false;
  }
}

export function ReminderSection() {
  const support = pushSupport();
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);
  // The time last saved to the subscription; a "Save" appears only when the
  // picker differs from it.
  const [savedTime, setSavedTime] = useState(DEFAULT_REMINDER_TIME);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const recheckPermission = useCallback(() => {
    void permissionBlocked().then((b) => mounted.current && setBlocked(b));
  }, []);

  useEffect(() => {
    if (support !== "ok") return;
    recheckPermission();
    getReminder()
      .then((r) => {
        if (r && mounted.current) {
          setReminderOn(true);
          setReminderTime(r.time);
          setSavedTime(r.time);
        }
      })
      .catch(() => {
        /* no existing subscription on this device — leave defaults */
      });
    // Coming back from Settings may have unblocked notifications.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") recheckPermission();
    });
    return () => sub.remove();
  }, [support, recheckPermission]);

  async function turnOn() {
    setBusy(true);
    setError(null);
    try {
      const { error, welcomed } = await enableReminder(reminderTime);
      if (error) {
        if (await permissionBlocked()) setBlocked(true);
        else if (error === NOT_ALLOWED)
          // Prompt dismissed or refused once: the OS can still ask again.
          setError("Notifications weren't allowed. Tap Turn on reminder to try again, and choose Allow.");
        else setError(error);
        return;
      }
      track({ type: "reminder_set", enabled: true });
      setReminderOn(true);
      setSavedTime(reminderTime);
      setNotice(welcomed ? "Today’s verse was just sent here, so you can see how it looks." : null);
    } catch {
      setError("Couldn't set the reminder — please try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError(null);
    try {
      const { error: offError } = await disableReminder();
      if (offError) {
        setError("Couldn't turn off the reminder — please try again.");
        return;
      }
      track({ type: "reminder_set", enabled: false });
      setReminderOn(false);
      setNotice(null);
    } catch {
      setError("Couldn't turn off the reminder — please try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  // With the reminder on, a new time must reach the stored subscription,
  // otherwise pushes keep firing at the old time. Committed by an explicit
  // Save (web commits on blur) so stepper taps don't race network writes.
  async function saveTime() {
    if (!reminderOn || reminderTime === savedTime) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await updateReminderTime(reminderTime);
      if (error) return setError(error);
      setSavedTime(reminderTime);
      setNotice("New time saved.");
    } catch {
      setError("Couldn't update the reminder time — please try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const intro = (
    <Small>Get today’s verse as a notification at a time you choose. Tap it to open your check-in.</Small>
  );

  if (support !== "ok") {
    return (
      <Section title="Daily verse reminder">
        {intro}
        <Small>
          Reminders aren’t available in this version of the app yet. They’ll arrive in an update — until then,
          your journal and progress back up as usual.
        </Small>
      </Section>
    );
  }

  const dirty = reminderOn && reminderTime !== savedTime;
  return (
    <Section title="Daily verse reminder" aside={reminderOn ? "On" : undefined}>
      {!reminderOn ? intro : null}

      {blocked && !reminderOn ? (
        <View style={{ gap: space.sm, alignItems: "flex-start" }}>
          <Small>
            Notifications are turned off for MindfulVerse on this phone. To get the reminder, allow notifications
            in Settings, then come back here.
          </Small>
          <Button
            title="Open settings"
            kind="secondary"
            onPress={() => void Linking.openSettings().catch(() => {})}
            accessibilityHint="Opens this app's system settings"
          />
        </View>
      ) : null}

      {!blocked && !reminderOn ? (
        <>
          <TimeStepper label="Remind me at" value={reminderTime} onChange={setReminderTime} disabled={busy} />
          <View style={{ flexDirection: "row" }}>
            <Button title={busy ? "Turning on…" : "Turn on reminder"} busy={busy} onPress={() => void turnOn()} />
          </View>
          <Small>Your phone will ask to allow notifications — choose Allow.</Small>
        </>
      ) : null}

      {reminderOn ? (
        <>
          <TimeStepper
            label="Every day at"
            value={reminderTime}
            onChange={(t) => {
              setReminderTime(t);
              setNotice(null);
            }}
            disabled={busy}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md }}>
            {dirty ? (
              <>
                <Button title="Save new time" busy={busy} onPress={() => void saveTime()} />
                <LinkButton title="Keep old time" disabled={busy} onPress={() => setReminderTime(savedTime)} />
              </>
            ) : (
              <LinkButton
                title="Turn off"
                disabled={busy}
                onPress={() => void turnOff()}
                hint="Stops the daily reminder on this phone"
              />
            )}
          </View>
          <Small>Set per device: this phone keeps its own reminder time.</Small>
        </>
      ) : null}

      {notice ? <Small>{notice}</Small> : null}
      <FormError message={error} />
    </Section>
  );
}
