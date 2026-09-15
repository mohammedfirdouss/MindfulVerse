// /account — optional identity. The whole app works signed-out; an account
// only backs up your journal and progress across devices.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../lib/auth";
import { insforge } from "../lib/insforge";
import { getSyncStatus, onSyncStatus, statusLabel, syncNow, type SyncStatus } from "../lib/sync";
import { track } from "../lib/analytics";
import { disableReminder, enableReminder, getReminder, pushSupport } from "../lib/push";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--surface-2)",
  color: "var(--ink)",
  font: "inherit",
};

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
        const { error } = await enableReminder(reminderTime);
        if (error) {
          setReminderError(error);
          return;
        }
        track({ type: "reminder_set", enabled: true });
        setReminderOn(true);
        setReminderNotice(`Daily verse reminder set for ${reminderTime}.`);
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

  async function signOut() {
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
      await insforge.database.from("journal_entries").delete().eq("user_id", user.id);
      await insforge.database.from("progress").delete().eq("user_id", user.id);
      await insforge.database.from("push_subscriptions").delete().eq("user_id", user.id);
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
        <div className="card">
          <p className="soft" style={{ margin: 0 }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <header style={{ paddingTop: 12 }}>
        <div className="eyebrow">Account</div>
        <h1 style={{ margin: "6px 0" }}>{user ? "Your account" : "Sign in"}</h1>
        {!user && (
          <p className="muted" style={{ marginTop: 0 }}>
            Optional. The Qur&rsquo;an is always free here — an account only backs
            up your journal and progress so they follow you to another device.
          </p>
        )}
      </header>

      {notice && (
        <div className="card">
          <p style={{ margin: 0 }}>{notice}</p>
        </div>
      )}

      {!user ? (
        <div className="card stack">
          {pendingVerification ? (
            <form className="stack" onSubmit={submitCode}>
              <p className="soft" style={{ margin: 0 }}>
                Enter the 6-digit code we emailed to {email}.
              </p>
              <label htmlFor="account-otp" style={{ fontWeight: 600 }}>
                Verification code
              </label>
              <input
                id="account-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                style={inputStyle}
                required
              />
              {error && (
                <p className="soft" style={{ color: "var(--indigo-deep)", margin: 0 }}>
                  {error}
                </p>
              )}
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Verifying…" : "Verify & sign in"}
              </button>
            </form>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={mode === "signin" ? "btn" : "btn secondary"}
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={mode === "signup" ? "btn" : "btn secondary"}
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </div>

              <form className="stack" onSubmit={submit}>
                <label htmlFor="account-email" style={{ fontWeight: 600 }}>
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={inputStyle}
                  required
                />
                <label htmlFor="account-password" style={{ fontWeight: 600 }}>
                  Password
                </label>
                <input
                  id="account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  style={inputStyle}
                  required
                />
                {error && (
                  <p className="soft" style={{ color: "var(--indigo-deep)", margin: 0 }}>
                    {error}
                  </p>
                )}
                <button className="btn" type="submit" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </button>
              </form>

              {oauthProviders.includes("google") && (
                <button type="button" className="btn secondary" onClick={google}>
                  Continue with Google
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card stack">
          <div>
            <div style={{ fontWeight: 600 }}>{user.name ?? user.email}</div>
            {user.name && <div className="soft" style={{ fontSize: ".9rem" }}>{user.email}</div>}
          </div>

          <p className="soft" style={{ margin: 0 }}>{statusLabel(status)}</p>

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

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 4 }}>
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
                    value={reminderTime}
                    disabled={reminderBusy}
                    onChange={(e) => setReminderTime(e.target.value)}
                    style={{ ...inputStyle, width: "auto" }}
                  />
                </div>
                {reminderNotice && (
                  <p className="soft" style={{ margin: 0 }}>{reminderNotice}</p>
                )}
                {reminderError && (
                  <p className="soft" style={{ color: "var(--indigo-deep)", margin: 0 }}>
                    {reminderError}
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <p className="soft" style={{ marginTop: 0, fontSize: ".9rem" }}>
              Deleting removes your journal and progress from your account.
              Entries already on this device are kept.
            </p>
            <button
              type="button"
              className="btn ghost"
              style={{ color: "var(--indigo-deep)" }}
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
