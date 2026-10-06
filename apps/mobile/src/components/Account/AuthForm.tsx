// Signed-out state of /account: email + password sign-in / sign-up, then the
// 6-digit email verification step. Ported from web's Account.tsx (same copy,
// errors and analytics). OAuth is web-only for now (PKCE needs crypto.subtle,
// absent on Hermes), so no provider buttons here.
import { useEffect, useRef, useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import { insforge } from "@mindfulverse/core/sync/insforge";
import { signIn, signUp, verifyEmail } from "../../session";
import { space } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { NETWORK_ERROR, normalizeOtp, validateCredentials, validateOtp } from "./logic";
import { Field, FormError, LinkButton, Small } from "./parts";

export type AuthMode = "signin" | "signup";

export function AuthForm({
  mode,
  onModeChange,
  onSignedIn,
  setNotice,
}: {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  /** Runs web's post-auth sequence (refresh, syncNow, notice). */
  onSignedIn: () => Promise<void>;
  setNotice: (n: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleOnWeb, setGoogleOnWeb] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  useEffect(() => {
    // Web offers "Continue with Google" when the backend has it enabled.
    // The app can't yet, so explain that instead of showing a dead button.
    insforge.auth
      .getPublicAuthConfig()
      .then(({ data }) => mounted.current && setGoogleOnWeb(!!data?.oAuthProviders?.includes("google")))
      .catch(() => {});
  }, []);

  async function submit() {
    if (busy) return;
    const invalid = validateCredentials(email, password);
    if (invalid) return setError(invalid);
    const addr = email.trim();
    setEmail(addr);
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error, needsVerification } = await signUp(addr, password);
        if (error) {
          setNotice(null);
          return setError(error);
        }
        if (needsVerification) {
          setPendingVerification(true);
          setNotice("Check your email for a 6-digit code, then enter it below.");
          return;
        }
        track({ type: "account_signup", method: "password" });
      } else {
        const { error } = await signIn(addr, password);
        if (error) {
          setNotice(null);
          return setError(error);
        }
        track({ type: "account_signin", method: "password" });
      }
      setPassword("");
      await onSignedIn();
    } catch {
      setNotice(null);
      setError(NETWORK_ERROR);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function submitCode() {
    if (busy) return;
    const invalid = validateOtp(otp);
    if (invalid) return setError(invalid);
    setError(null);
    setBusy(true);
    try {
      const { error } = await verifyEmail(email, otp);
      if (error) {
        setNotice(null);
        return setError(error);
      }
      track({ type: "account_signup", method: "password" });
      setPendingVerification(false);
      setOtp("");
      setPassword("");
      await onSignedIn();
    } catch {
      setNotice(null);
      setError(NETWORK_ERROR);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function switchMode(next: AuthMode) {
    onModeChange(next);
    setError(null);
  }

  if (pendingVerification) {
    return (
      <Card>
        <Text variant="soft">Enter the 6-digit code we emailed to {email}.</Text>
        <Field
          label="Verification code"
          value={otp}
          onChangeText={(t) => setOtp(normalizeOtp(t))}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          maxLength={6}
          placeholder="123456"
          returnKeyType="go"
          onSubmitEditing={() => void submitCode()}
          editable={!busy}
          autoFocus
          style={{ letterSpacing: 4 }}
        />
        <FormError message={error} />
        <Button
          title={busy ? "Verifying…" : "Verify & sign in"}
          busy={busy}
          onPress={() => void submitCode()}
          accessibilityLabel="Verify and sign in"
        />
        <View style={{ alignItems: "center" }}>
          <LinkButton
            title="Use a different email"
            disabled={busy}
            onPress={() => {
              setPendingVerification(false);
              setOtp("");
              setError(null);
              setNotice(null);
            }}
          />
        </View>
      </Card>
    );
  }

  const signup = mode === "signup";
  return (
    <Card>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType={signup ? "username" : "emailAddress"}
        placeholder="you@example.com"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!busy}
      />
      <Field
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={signup ? "new-password" : "current-password"}
        textContentType={signup ? "newPassword" : "password"}
        placeholder={signup ? "At least 6 characters" : ""}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        editable={!busy}
      />
      <FormError message={error} />
      <Button
        title={busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
        busy={busy}
        onPress={() => void submit()}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: space.xs }}>
        <Text variant="soft">{signup ? "Already have an account?" : "New here?"}</Text>
        <LinkButton
          title={signup ? "Sign in" : "Create an account"}
          disabled={busy}
          onPress={() => switchMode(signup ? "signin" : "signup")}
        />
      </View>
      {googleOnWeb ? (
        <Small>
          Google sign-in is on the website only for now. In the app, use your email and password.
        </Small>
      ) : null}
    </Card>
  );
}
