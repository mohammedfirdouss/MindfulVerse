// The reflection area: the physical tadabbur journal's three questions.
// Saving writes one journal entry through core (synchronous over MMKV) with
// the same prompt/body/context as web.
//
// Keystrokes: the inputs are controlled by state that lives HERE, so a parent
// re-render can never reset what is being typed. The parent only mirrors the
// draft (to keep it across Back/Next and to warn before leaving); it passes
// `initial` once, and the component is keyed by verse.
import { addEntry } from "@mindfulverse/core/journal";
import { track } from "@mindfulverse/core/analytics";
import { memo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";
import { composeReflection, EMPTY_DRAFT, hasText, type Draft } from "./logic";

const FIELDS: { key: keyof Draft; label: string }[] = [
  { key: "lessons", label: "What does it teach?" },
  { key: "stirs", label: "What stays with you?" },
  { key: "action", label: "What will you do?" },
];

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
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const inputs = useRef<Partial<Record<keyof Draft, TextInput | null>>>({});

  const canSave = status !== "saved" && hasText(draft);

  function change(key: keyof Draft, value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setStatus("idle");
    onDraft(verseKey, next);
  }

  function save() {
    const entry = composeReflection(verseKey, draft);
    if (!entry || status === "saved") return;
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
    setStatus("saved");
  }

  return (
    <View
      style={{
        backgroundColor: colors.cottonRaised,
        borderWidth: 1,
        borderColor: colors.lineStrong,
        borderRadius: radius.md,
        padding: space.lg,
        gap: space.md,
      }}
    >
      <Text variant="eyebrow" accessibilityRole="header">
        Your tadabbur
      </Text>
      <Text variant="muted">
        Sit with {name} {verseKey} — write as little or as much as you like.
      </Text>
      {FIELDS.map((f) => (
        <View key={f.key} style={{ gap: space.xs }}>
          <Text variant="soft" nativeID={`tadabbur-${f.key}`} style={{ fontSize: 15.5 }}>
            {f.label}
          </Text>
          <TextInput
            ref={(r) => {
              inputs.current[f.key] = r;
            }}
            value={draft[f.key]}
            onChangeText={(t) => change(f.key, t)}
            onFocus={() => {
              const r = inputs.current[f.key];
              if (r) onFocusInput(r);
            }}
            multiline
            textAlignVertical="top"
            accessibilityLabel={f.label}
            accessibilityLabelledBy={`tadabbur-${f.key}`}
            placeholderTextColor={colors.inkFaint}
            selectionColor={colors.indigo}
            style={{
              minHeight: 72,
              padding: 10,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.cotton,
              color: colors.ink,
              fontFamily: fonts.read,
              fontSize: 16,
              lineHeight: 24,
            }}
          />
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <Button kind="secondary" title="Save reflection" onPress={save} disabled={!canSave} />
        {status === "saved" ? (
          <Text variant="muted" accessibilityLiveRegion="polite" accessibilityRole="text">
            Saved
          </Text>
        ) : null}
      </View>
      {status === "failed" ? (
        <Text variant="soft" accessibilityLiveRegion="assertive">
          That reflection couldn’t be saved on this device. Your words are still here — try again.
        </Text>
      ) : null}
    </View>
  );
});
