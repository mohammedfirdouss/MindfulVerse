// The reflection area: the physical tadabbur journal's three questions, asked
// one at a time like a conversation. Every keystroke is mirrored to the parent,
// which persists the draft (localStorage over MMKV), so nothing typed is lost.
// "Keep in journal" writes one journal entry through core with the same
// prompt/body/context as web, then clears that verse's draft.
//
// Keystrokes: the inputs are controlled by state that lives HERE, so a parent
// re-render can never reset what is being typed. The parent passes `initial`
// once, and the component is keyed by verse.
import { addEntry } from "@mindfulverse/core/journal";
import { track } from "@mindfulverse/core/analytics";
import { memo, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { tapSuccess, tickSelection } from "../../platform/haptics";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, DyeRule, Text } from "../../ui";
import { composeReflection, EMPTY_DRAFT, hasText, QUESTIONS, questionStepLabel, type Draft } from "./logic";

function StepDiamonds({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={questionStepLabel(step)}
      style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 4 }}
    >
      {QUESTIONS.map((q, i) => (
        <View
          key={q.key}
          style={{
            width: 9,
            height: 9,
            transform: [{ rotate: "45deg" }],
            borderWidth: 1.5,
            borderColor: i === step ? colors.kola : colors.lineStrong,
            backgroundColor: i === step ? colors.kola : "transparent",
          }}
        />
      ))}
    </View>
  );
}

export const ReflectionArea = memo(function ReflectionArea({
  verseKey,
  name,
  initial,
  onDraft,
  onFocusInput,
}: {
  verseKey: string;
  name: string;
  initial: Draft;
  onDraft: (verseKey: string, d: Draft) => void;
  /** Lets the screen scroll the focused input above the keyboard. */
  onFocusInput: (input: TextInput) => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Draft>(initial);
  const [status, setStatus] = useState<"idle" | "kept" | "failed">("idle");
  const [step, setStep] = useState(0);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput | null>(null);
  const moved = useRef(false);

  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  const answered = draft[q.key].trim().length > 0;
  const canKeep = hasText(draft);

  // After moving between questions, carry focus to the new prompt's input.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    input.current?.focus();
  }, [step]);

  function change(value: string) {
    const next = { ...draft, [q.key]: value };
    setDraft(next);
    setStatus("idle");
    onDraft(verseKey, next);
  }

  function go(to: number) {
    moved.current = true;
    tickSelection();
    setStep(to);
  }

  function keep() {
    const entry = composeReflection(verseKey, draft);
    if (!entry) return;
    try {
      // Sync MMKV write; marks the journal dirty for the sync engine. Core's
      // JOURNAL_SAVED_EVENT is not dispatched on native (F1 guard), so nothing
      // here waits on it: the Journal tab re-reads on focus.
      addEntry(entry);
    } catch {
      setStatus("failed"); // storage full/unavailable: keep the draft
      return;
    }
    track({ type: "journal_save", context: "tadabbur" });
    setDraft(EMPTY_DRAFT);
    onDraft(verseKey, EMPTY_DRAFT);
    setStep(0);
    setStatus("kept");
    tapSuccess();
  }

  return (
    <View style={{ gap: space.md }}>
      <DyeRule style={{ marginVertical: space.sm }} />
      <View style={{ gap: space.xs }}>
        <Text variant="eyebrow" accessibilityRole="header">
          Your tadabbur
        </Text>
        <Text variant="muted">
          Sit with {name} {verseKey} — write as little or as much as you like.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <StepDiamonds step={step} />
        <Text
          nativeID={`tadabbur-${q.key}`}
          style={{ fontFamily: fonts.readSemiBold, fontSize: 17, lineHeight: 24, color: colors.indigoDeep }}
        >
          {q.label}
        </Text>
        <TextInput
          key={q.key}
          ref={input}
          value={draft[q.key]}
          onChangeText={change}
          onFocus={() => {
            setFocused(true);
            if (input.current) onFocusInput(input.current);
          }}
          onBlur={() => setFocused(false)}
          multiline
          textAlignVertical="top"
          accessibilityLabel={q.label}
          accessibilityLabelledBy={`tadabbur-${q.key}`}
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.indigo}
          style={{
            minHeight: 112,
            paddingHorizontal: space.md,
            paddingTop: space.sm + 4,
            paddingBottom: space.sm + 4,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: focused ? colors.indigo : colors.lineStrong,
            backgroundColor: colors.cottonRaised,
            color: colors.ink,
            fontFamily: fonts.read,
            fontSize: 17,
            lineHeight: 26,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 }}>
          {step > 0 ? (
            <Button
              kind="ghost"
              title="Back"
              accessibilityLabel="Back to the previous question"
              onPress={() => go(step - 1)}
            />
          ) : null}
          <View style={{ flex: 1 }} />
          {!last ? (
            answered ? (
              <Button kind="ghost" title="Next question" onPress={() => go(step + 1)} />
            ) : (
              <Button
                kind="ghost"
                title="Skip"
                accessibilityLabel="Skip this question"
                onPress={() => go(step + 1)}
              />
            )
          ) : null}
        </View>
      </View>

      <View style={{ gap: space.sm, alignItems: "flex-start" }}>
        <Button kind="secondary" title="Keep in journal" onPress={keep} disabled={!canKeep} />
        {status === "kept" ? (
          <Text variant="muted" accessibilityLiveRegion="polite" accessibilityRole="text">
            Kept in your journal ✓
          </Text>
        ) : canKeep && status === "idle" ? (
          <Text variant="muted" style={{ fontSize: 14 }}>
            Draft kept
          </Text>
        ) : null}
      </View>
      {status === "failed" ? (
        <Text variant="soft" accessibilityLiveRegion="assertive">
          That reflection couldn’t be kept on this device. Your words are still here — try again.
        </Text>
      ) : null}
    </View>
  );
});
