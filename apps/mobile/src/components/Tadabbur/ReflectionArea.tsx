import { track } from "@mindfulverse/core/analytics";
// The reflection area: four questions (web's SurahTadabbur), asked one at a
// time like a conversation. Every change is mirrored to the parent, which
// persists the draft (localStorage over MMKV), so nothing typed is lost.
// "Keep in journal" writes one journal entry through core with the same
// prompt/body/context as web, then clears that verse's draft.
//
// Keystrokes: the inputs are controlled by state that lives HERE, so a parent
// re-render can never reset what is being typed. The parent passes `initial`
// once, and the component is keyed by verse.
import {
  CLOUD_COPY,
  getCloudOptIn,
  setCloudOptIn,
  shareFeelings,
} from "@mindfulverse/core/feelingCloud";
import { addEntry } from "@mindfulverse/core/journal";
import {
  EMPTY_REFLECTION,
  FEELINGS,
  hasReflection,
  MAX_FEELINGS,
  PROMPT_INTRO,
  PROMPTS,
} from "@mindfulverse/core/reflectionPrompts";
import type { ReflectionDraft } from "@mindfulverse/core/reflectionPrompts";
import { memo, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { TextInputInstance } from "react-native";
import Svg, { Path } from "react-native-svg";

import { tapSuccess, tickSelection } from "../../platform/haptics";
import { fonts, radius, space, useTheme } from "../../theme";
import { Button, DyeRule, Text } from "../../ui";
import { useReducedMotion } from "../../ui/FadeRise";
import {
  composeReflection,
  QUESTIONS,
  questionStepLabel,
  stepAnswered,
  toggleFeeling,
} from "./logic";

type Edit = (patch: Partial<ReflectionDraft>) => void;

function StepDiamonds({ step }: { step: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={questionStepLabel(step)}
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 10,
        paddingVertical: 4,
      }}
    >
      {QUESTIONS.map((q, i) => (
        <View
          key={q.key}
          style={{
            backgroundColor: i === step ? colors.kola : "transparent",
            borderColor: i === step ? colors.kola : colors.lineStrong,
            borderWidth: 1.5,
            height: 9,
            transform: [{ rotate: "45deg" }],
            width: 9,
          }}
        />
      ))}
    </View>
  );
}

/** A question's prompt line. `nativeID` lets its input be labelled by it. */
function Prompt({ id, children }: { id: string; children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      nativeID={id}
      style={{
        color: colors.indigoDeep,
        fontFamily: fonts.readSemiBold,
        fontSize: 17,
        lineHeight: 24,
      }}
    >
      {children}
    </Text>
  );
}

/** One text box. `size` sets its height: a paragraph, a short note, or a
 *  single line (the one-line action). */
function Field({
  value,
  onChange,
  label,
  labelledBy,
  placeholder,
  size,
  inputRef,
  onFocusInput,
}: {
  value: string;
  onChange: (text: string) => void;
  label: string;
  labelledBy?: string;
  placeholder?: string;
  size: "long" | "short" | "line";
  inputRef?: { current: TextInputInstance | null };
  onFocusInput: (input: TextInputInstance) => void;
}) {
  const { colors } = useTheme();
  const own = useRef<TextInputInstance | null>(null);
  const [focused, setFocused] = useState(false);
  const line = size === "line";
  const minHeight = size === "long" ? 112 : size === "short" ? 76 : 48;
  return (
    <TextInput
      ref={(el) => {
        own.current = el;
        if (inputRef) {
          inputRef.current = el;
        }
      }}
      value={value}
      onChangeText={onChange}
      onFocus={() => {
        setFocused(true);
        if (own.current) {
          onFocusInput(own.current);
        }
      }}
      onBlur={() => setFocused(false)}
      multiline={!line}
      textAlignVertical={line ? "center" : "top"}
      accessibilityLabel={label}
      accessibilityLabelledBy={labelledBy}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      selectionColor={colors.indigo}
      style={{
        backgroundColor: colors.cottonRaised,
        borderColor: focused ? colors.indigo : colors.lineStrong,
        borderRadius: radius.md,
        borderWidth: 1,
        color: colors.ink,
        fontFamily: fonts.read,
        fontSize: 17,
        lineHeight: 26,
        minHeight,
        paddingBottom: line ? 10 : space.sm + 4,
        paddingHorizontal: space.md,
        paddingTop: line ? 10 : space.sm + 4,
      }}
    />
  );
}

/** The first question's feeling words: the Check-in pills (outlined, the
 *  chosen ones indigo). Up to MAX_FEELINGS; the rest go quiet once full. */
function FeelingChips({ feelings, edit }: { feelings: string[]; edit: Edit }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const full = feelings.length >= MAX_FEELINGS;
  return (
    <View
      accessibilityLabel={PROMPTS.feeling}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
    >
      {FEELINGS.map((word) => {
        const on = feelings.includes(word);
        const off = full && !on;
        return (
          <Pressable
            key={word}
            accessibilityRole="button"
            accessibilityState={{ disabled: off, selected: on }}
            disabled={off}
            onPress={() => {
              tickSelection();
              edit({ feelings: toggleFeeling(feelings, word) });
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: on
                ? colors.indigo
                : pressed
                  ? colors.indigoWash
                  : colors.cottonRaised,
              borderColor: on ? colors.indigo : colors.lineStrong,
              borderRadius: 999,
              borderWidth: 1,
              justifyContent: "center",
              minHeight: 44,
              opacity: off ? 0.45 : 1,
              paddingHorizontal: 14,
              transform: [{ scale: pressed && !reduce ? 0.97 : 1 }],
            })}
          >
            <Text
              style={{
                color: on ? colors.cotton : colors.inkSoft,
                fontFamily: on ? fonts.readSemiBold : fonts.read,
                fontSize: 16,
                lineHeight: 21,
              }}
            >
              {word}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Add my feelings to the anonymous cloud": a checkbox, off by default. */
function CloudOptIn({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityHint={CLOUD_COPY.optInHelp}
        onPress={() => {
          tickSelection();
          onChange(!on);
        }}
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: space.sm + 2,
          minHeight: 44,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: on ? colors.indigo : colors.cottonRaised,
            borderColor: on ? colors.indigo : colors.lineStrong,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            height: 22,
            justifyContent: "center",
            width: 22,
          }}
        >
          {on ? (
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M4 12.5 L9.5 18 L20 6.5"
                fill="none"
                stroke={colors.cotton}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </View>
        <Text style={{ color: colors.inkSoft, flex: 1, fontSize: 15.5 }}>
          {CLOUD_COPY.optIn}
        </Text>
      </Pressable>
      <Text
        variant="muted"
        importantForAccessibility="no"
        style={{ fontSize: 13.5, lineHeight: 19, paddingLeft: 32 }}
      >
        {CLOUD_COPY.optInHelp}
      </Text>
    </View>
  );
}

/** The controls for one question. `inputRef` gets its main text box, so
 *  moving between questions can carry focus there. */
function QuestionFields({
  step,
  draft,
  edit,
  inputRef,
  onFocusInput,
  cloudOptIn,
  onCloudOptIn,
}: {
  step: number;
  draft: ReflectionDraft;
  edit: Edit;
  inputRef: { current: TextInputInstance | null };
  onFocusInput: (input: TextInputInstance) => void;
  cloudOptIn: boolean;
  onCloudOptIn: (on: boolean) => void;
}) {
  const key = QUESTIONS[step].key;
  const id = `tadabbur-${key}`;
  if (key === "feeling") {
    return (
      <>
        <Prompt id={id}>{PROMPTS.feeling}</Prompt>
        <Text variant="muted" style={{ fontSize: 14.5 }}>
          Pick up to three.
        </Text>
        <FeelingChips feelings={draft.feelings} edit={edit} />
        <CloudOptIn on={cloudOptIn} onChange={onCloudOptIn} />
        <Field
          value={draft.feelingNote}
          onChange={(feelingNote) => edit({ feelingNote })}
          label="Say more about how it made you feel"
          placeholder={PROMPTS.feelingPlaceholder}
          size="short"
          onFocusInput={onFocusInput}
        />
      </>
    );
  }
  if (key === "reminder") {
    return (
      <>
        <Prompt id={id}>{PROMPTS.reminder}</Prompt>
        <Field
          value={draft.reminder}
          onChange={(reminder) => edit({ reminder })}
          label={PROMPTS.reminder}
          labelledBy={id}
          size="long"
          inputRef={inputRef}
          onFocusInput={onFocusInput}
        />
      </>
    );
  }
  if (key === "takeaway") {
    return (
      <>
        <Prompt id={id}>{PROMPTS.takeaway}</Prompt>
        <Field
          value={draft.takeaway}
          onChange={(takeaway) => edit({ takeaway })}
          label={PROMPTS.takeaway}
          labelledBy={id}
          size="long"
          inputRef={inputRef}
          onFocusInput={onFocusInput}
        />
        <Field
          value={draft.action}
          onChange={(action) => edit({ action })}
          label={PROMPTS.actionPlaceholder}
          placeholder={PROMPTS.actionPlaceholder}
          size="line"
          onFocusInput={onFocusInput}
        />
      </>
    );
  }
  return (
    <>
      <Prompt id={id}>{PROMPTS.research}</Prompt>
      <Field
        value={draft.research}
        onChange={(research) => edit({ research })}
        label={PROMPTS.research}
        labelledBy={id}
        size="short"
        inputRef={inputRef}
        onFocusInput={onFocusInput}
      />
    </>
  );
}

export const ReflectionArea = memo(
  ({
    verseKey,
    surah,
    name,
    initial,
    onDraft,
    onFocusInput,
  }: {
    verseKey: string;
    surah: number;
    name: string;
    initial: ReflectionDraft;
    onDraft: (verseKey: string, d: ReflectionDraft) => void;
    /** Lets the screen scroll the focused input above the keyboard. */
    onFocusInput: (input: TextInputInstance) => void;
  }) => {
    const [draft, setDraft] = useState<ReflectionDraft>(initial);
    const [status, setStatus] = useState<"idle" | "kept" | "failed">("idle");
    const [step, setStep] = useState(0);
    const [cloudOptIn, setCloudOptInState] = useState(getCloudOptIn);
    const input = useRef<TextInputInstance | null>(null);
    const moved = useRef(false);

    const last = step === QUESTIONS.length - 1;
    const answered = stepAnswered(draft, step);
    const canKeep = hasReflection(draft);

    // After moving between questions, carry focus to the new question's text
    // box. The first question opens on its feeling words, so nothing is
    // focused there and the keyboard stays down.
    useEffect(() => {
      if (!moved.current) {
        return;
      }
      moved.current = false;
      input.current?.focus();
    }, [step]);

    function edit(patch: Partial<ReflectionDraft>) {
      const next = { ...draft, ...patch };
      setDraft(next);
      setStatus("idle");
      onDraft(verseKey, next);
    }

    function changeCloudOptIn(on: boolean) {
      setCloudOptIn(on);
      setCloudOptInState(on);
    }

    function go(to: number) {
      moved.current = true;
      tickSelection();
      setStep(to);
    }

    function keep() {
      const entry = composeReflection(verseKey, draft);
      if (!entry) {
        return;
      }
      try {
        // Sync MMKV write; marks the journal dirty for the sync engine. Core's
        // JOURNAL_SAVED_EVENT is not dispatched on native (F1 guard), so nothing
        // here waits on it: the Journal tab re-reads on focus.
        addEntry(entry);
      } catch {
        setStatus("failed"); // storage full/unavailable: keep the draft
        return;
      }
      track({ context: "tadabbur", type: "journal_save" });
      if (cloudOptIn && draft.feelings.length > 0) {
        // Fire and forget: the entry is already saved, sharing never blocks it.
        void shareFeelings(surah, draft.feelings);
      }
      setDraft(EMPTY_REFLECTION);
      onDraft(verseKey, EMPTY_REFLECTION);
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
            Sit with {name} {verseKey}. {PROMPT_INTRO}
          </Text>
        </View>

        <View style={{ gap: space.sm }}>
          <StepDiamonds step={step} />
          <QuestionFields
            key={step}
            step={step}
            draft={draft}
            edit={edit}
            inputRef={input}
            onFocusInput={onFocusInput}
            cloudOptIn={cloudOptIn}
            onCloudOptIn={changeCloudOptIn}
          />
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: space.md,
              minHeight: 44,
            }}
          >
            {step > 0 ? (
              <Button
                kind="ghost"
                title="Back"
                accessibilityLabel="Back to the previous question"
                onPress={() => go(step - 1)}
              />
            ) : null}
            <View style={{ flex: 1 }} />
            {last ? null : answered ? (
              <Button
                kind="ghost"
                title="Next question"
                onPress={() => go(step + 1)}
              />
            ) : (
              <Button
                kind="ghost"
                title="Skip"
                accessibilityLabel="Skip this question"
                onPress={() => go(step + 1)}
              />
            )}
          </View>
        </View>

        <View style={{ alignItems: "flex-start", gap: space.sm }}>
          <Button
            kind="secondary"
            title="Keep in journal"
            onPress={keep}
            disabled={!canKeep}
          />
          {status === "kept" ? (
            <Text
              variant="muted"
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
            >
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
            That reflection couldn’t be kept on this device. Your words are
            still here. Try again.
          </Text>
        ) : null}
      </View>
    );
  }
);
