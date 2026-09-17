// /account — optional identity. The whole app works signed-out; an account
// only backs up your journal and progress across devices.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../lib/auth";
import { insforge } from "../lib/insforge";
import {
  getSyncStatus, onSyncStatus, resolveOwnerMismatch, statusLabel, syncNow, type SyncStatus,
} from "../lib/sync";
import { track } from "../lib/analytics";
import { disableReminder, enableReminder, getReminder, pushSupport, updateReminderTime } from "../lib/push";
import FeedbackLink from "../components/FeedbackLink";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Account() {
  const { user, loading, refresh } = useAccount();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [oauthProviders, setOauthProviders] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState("07:00");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  // Fire sync_done only when the status actually transitions to a terminal
  // state, never on every render/poll.
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
    []
  );

  useEffect(() => {
    // Enabled providers come from backend metadata; render only what exists.
    insforge.auth
      .getPublicAuthConfig()
      .then(({ data }) => setOauthProviders(data?.oAuthProviders ?? []))
      .catch(() => setOauthProviders([]));
  }, []);

  useEffect(() => {
    if (!user || pushSupport() !== "ok") return;
    getReminder()
      .then((r) => {
        if (r) {
          setReminderOn(true);
          setReminderTime(r.time);
        }
      })
      .catch(() => {
        /* no existing subscription on this device — leave defaults */
      });
  }, [user]);

  async function toggleReminder(next: boolean) {
    setReminderBusy(true);
    setReminderError(null);
    try {
      if (next) {
        const { error, welcomed } = await enableReminder(reminderTime);
        if (error) {
          setReminderError(error);
          return;
        }
        track({ type: "reminder_set", enabled: true });
        setReminderOn(true);
        setReminderNotice(
          welcomed
            ? `Today's verse is on its way to this device. From tomorrow it arrives daily at ${reminderTime}.`
            : `Daily verse reminder set for ${reminderTime}.`
        );
      } else {
        await disableReminder();
        track({ type: "reminder_set", enabled: false });
        setReminderOn(false);
        setReminderNotice(null);
      }
    } catch {
      setReminderError("Couldn't set the reminder — please try again.");
    } finally {
      setReminderBusy(false);
    }
  }

  // With the reminder already on, a time edit must reach the stored
  // subscription — otherwise pushes keep firing at the old time.
  async function changeReminderTime(time: string) {
    setReminderTime(time);
    if (!reminderOn) return;
    setReminderBusy(true);
    setReminderError(null);
    try {
      const { error } = await updateReminderTime(time);
      if (error) {
        setReminderError(error);
        return;
      }
      setReminderNotice(`Daily verse reminder set for ${time}.`);
    } catch {
      setReminderError("Couldn't update the reminder time — please try again.");
    } finally {
      setReminderBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await insforge.auth.signUp({ email, password });
        if (error) {
          setNotice(null);
          return setError(error.message);
        }
        if (data?.requireEmailVerification) {
          setPendingVerification(true);
          setNotice("Check your email for a 6-digit code, then enter it below.");
          return;
        }
        track({ type: "account_signup", method: "password" });
      } else {
        const { error } = await insforge.auth.signInWithPassword({ email, password });
        if (error) {
          setNotice(null);
          return setError(error.message);
        }
        track({ type: "account_signin", method: "password" });
      }
      await refresh();
      await syncNow();
      setNotice("Signed in — your journal is now backed up to your account.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await insforge.auth.verifyEmail({ email, otp });
      if (error) {
        setNotice(null);
        return setError(error.message);
      }
      track({ type: "account_signup", method: "password" });
      setPendingVerification(false);
      setOtp("");
      await refresh();
      await syncNow();
      setNotice("Signed in — your journal is now backed up to your account.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    track({ type: "account_signin", method: "google" });
    await insforge.auth.signInWithOAuth("google", {
      redirectTo: `${window.location.origin}/account`,
    });
  }

  async function resolveSwitch(choice: "merge" | "fresh") {
    if (choice === "fresh") {
      const sure = window.confirm(
        "Start fresh? This removes the journal entries and progress stored on this device. " +
          "Anything already backed up to the other account stays safe there."
      );
      if (!sure) return;
    }
    setBusy(true);
    try {
      await resolveOwnerMismatch(choice);
      setNotice(
        choice === "merge"
          ? "This device's entries have been merged into your account."
          : "This device was reset and now shows only this account's backup."
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    // Drop the push subscription first: once signed out, RLS no longer lets us
    // delete our own row, and it would keep receiving reminders.
    try {
      await disableReminder();
    } catch {
      /* best effort — sign-out must proceed regardless */
    }
    await insforge.auth.signOut();
    track({ type: "account_signout" });
    await refresh();
    setNotice("Signed out. Your entries stay on this device but are no longer backed up.");
  }

  async function deleteMyData() {
    if (!user) return;
    const sure = window.confirm(
      "Delete all synced data from your account? Entries on this device are kept."
    );
    if (!sure) return;
    setBusy(true);
    try {
      // Only sign out once every delete succeeded — signing out on a partial
      // failure would strand data the user believes is gone.
      const results = await Promise.all([
        insforge.database.from("journal_entries").delete().eq("user_id", user.id),
        insforge.database.from("progress").delete().eq("user_id", user.id),
        insforge.database.from("push_subscriptions").delete().eq("user_id", user.id),
      ]);
      if (results.some((r) => r.error)) {
        setNotice(null);
        setError("Couldn't delete everything — please try again.");
        return;
      }
      setError(null);
      await signOut();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <header style={{ paddingTop: 12 }}>
          <div className="eyebrow">Account</div>
          <h1 style={{ margin: "6px 0" }}>Your account</h1>
        </header>
        <div className="auth-card">
          <p className="soft" style={{ margin: 0 }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">Account</div>
        <h1 style={{ margin: "6px 0" }}>
          {user ? "Your account" : mode === "signup" ? "Create account" : "Sign in"}
        </h1>
        {!user && (
          <p className="muted" style={{ marginTop: 0 }}>
            Optional. The Qur&rsquo;an is always free here — an account only backs
            up your journal and progress so they follow you to another device.
          </p>
        )}
      </header>

      {notice && (
        <div className="notice-wash">
          <p>{notice}</p>
        </div>
      )}

      {!user ? (
        <div className="auth-card stack">
          {pendingVerification ? (
            <form className="stack" onSubmit={submitCode}>
              <p className="soft" style={{ margin: 0 }}>
                Enter the 6-digit code we emailed to {email}.
              </p>
              <label className="field otp" htmlFor="account-otp">
                <span className="field-label">Verification code</span>
                <input
                  id="account-otp"
                  className="field-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
                {busy ? "Verifying…" : "Verify & sign in"}
              </button>
            </form>
          ) : (
            <>
              <form className="stack" onSubmit={submit}>
                <label className="field" htmlFor="account-email">
                  <span className="field-label">Email</span>
                  <input
                    id="account-email"
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label className="field" htmlFor="account-password">
                  <span className="field-label">Password</span>
                  <input
                    id="account-password"
                    className="field-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? "At least 6 characters" : ""}
                    required
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
                  {busy
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </button>
                <p className="soft" style={{ margin: 0, textAlign: "center", fontSize: ".95rem" }}>
                  {mode === "signin" ? (
                    <>
                      New here?{" "}
                      <button type="button" className="link-btn" onClick={() => setMode("signup")}>
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>

              {oauthProviders.includes("google") && (
                <>
                  <div className="or-divider">or</div>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={google}
                    style={{ width: "100%" }}
                  >
                    <GoogleMark />
                    Continue with Google
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="auth-card stack">
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{user.name ?? user.email}</div>
            {user.name && <div className="soft" style={{ fontSize: ".9rem" }}>{user.email}</div>}
          </div>

          {statusLabel(status) && (
            <p className="soft" style={{ margin: 0 }}>{statusLabel(status)}</p>
          )}

          {status === "switched-account" && (
            <div className="notice-wash stack">
              <p className="soft" style={{ margin: 0 }}>
                The journal entries and progress saved on this device were written
                while a different account was signed in. Nothing is being backed up
                until you choose what should happen to them.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void resolveSwitch("merge")}
                >
                  Merge into this account
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => void resolveSwitch("fresh")}
                >
                  Start fresh on this device
                </button>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => void syncNow()}
              disabled={status === "syncing"}
            >
              Sync now
            </button>
            <Link to="/journal" className="btn secondary">
              Export journal
            </Link>
          </div>

          <div className="auth-section">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Daily verse reminder</div>
            {pushSupport() === "needs-install" && (
              <p className="soft" style={{ margin: 0 }}>
                To get reminders on iPhone, first add MindfulVerse to your Home Screen
                (Share → Add to Home Screen), then return here.
              </p>
            )}
            {pushSupport() === "unsupported" && (
              <p className="soft" style={{ margin: 0 }}>
                This browser doesn&rsquo;t support notifications.
              </p>
            )}
            {pushSupport() === "ok" && (
              <div className="stack">
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={reminderOn}
                      disabled={reminderBusy}
                      onChange={(e) => void toggleReminder(e.target.checked)}
                    />
                    <span className="soft">Remind me daily</span>
                  </label>
                  <input
                    type="time"
                    className="field-input"
                    value={reminderTime}
                    disabled={reminderBusy}
                    onChange={(e) => void changeReminderTime(e.target.value)}
                    style={{ width: "auto" }}
                  />
                </div>
                {reminderNotice && (
                  <p className="soft" style={{ margin: 0 }}>{reminderNotice}</p>
                )}
                {reminderError && <p className="form-error">{reminderError}</p>}
              </div>
            )}
          </div>

          <div className="auth-section">
            <FeedbackLink subject="About my MindfulVerse account" />
          </div>

          <div className="auth-section">
            <button type="button" className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </div>

          <div className="auth-section">
            <p className="soft" style={{ marginTop: 0, fontSize: ".9rem" }}>
              Deleting removes your journal and progress from your account.
              Entries already on this device are kept.
            </p>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--kola)" }}
              onClick={deleteMyData}
              disabled={busy}
            >
              Delete my data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
