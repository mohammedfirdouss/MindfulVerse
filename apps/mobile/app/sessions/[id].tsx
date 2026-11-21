// A topic session, stepped through verbatim. Port of web's
// pages/SessionPlayer.tsx (same flow, copy, progress and analytics).
//
// Phases: -1 = intro, 0..steps-1 = a step, steps = the journal screen.
import { track } from "@mindfulverse/core/analytics";
import { loadSessions } from "@mindfulverse/core/data";
import {
  getSessionProgress,
  recordSessionStep,
} from "@mindfulverse/core/progress";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { TadabburSession } from "@mindfulverse/core/types";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  View,
} from "react-native";
import type {
  HostInstance,
  ScrollViewInstance,
  TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinalScreen } from "../../src/components/Sessions/FinalScreen";
import {
  resumeStepFor,
  sessionState,
  stepCountLabel,
} from "../../src/components/Sessions/logic";
import { StepView } from "../../src/components/Sessions/StepView";
import { useSurahNames } from "../../src/components/Sessions/useSurahNames";
import { space, useTheme } from "../../src/theme";
import { Button, Card, Text } from "../../src/ui";
import { FadeRise, useReducedMotion } from "../../src/ui/FadeRise";

type LoadStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "notfound" }
  | { kind: "ready"; session: TadabburSession };

function leave() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/sessions");
  }
}

/** Keyboard-aware scrolling page shared by every phase. */
function usePage(title: string) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<HostInstance>(null);
  const focused = useRef<TextInputInstance | null>(null);

  const revealFocused = useCallback(() => {
    const input = focused.current;
    const content = contentRef.current;
    if (!input || !content) {
      return;
    }
    input.measureLayout(
      content,
      (_x, y) =>
        scrollRef.current?.scrollTo({
          animated: true,
          y: Math.max(0, y - space.xxl * 2),
        }),
      () => {}
    );
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", revealFocused);
    return () => sub.remove();
  }, [revealFocused]);

  const onFocusInput = useCallback(
    (input: TextInputInstance) => {
      focused.current = input;
      if (Keyboard.isVisible()) {
        revealFocused();
      }
    },
    [revealFocused]
  );

  const toTop = useCallback(() => {
    scrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);

  const page = (children: ReactNode) => (
    <KeyboardAvoidingView
      style={{ backgroundColor: colors.cotton, flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen options={{ title }} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + space.xxl,
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
        }}
      >
        <View ref={contentRef} collapsable={false} style={{ gap: space.md }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return { onFocusInput, page, toTop };
}

export default function SessionPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { page } = usePage("Session");

  useEffect(() => {
    let alive = true;
    setStatus({ kind: "loading" });
    loadSessions()
      .then((sessions) => {
        if (!alive) {
          return;
        }
        const session = sessions.find((s) => s.id === id);
        setStatus(session ? { kind: "ready", session } : { kind: "notfound" });
      })
      .catch(() => {
        if (alive) {
          setStatus({ kind: "error" });
        }
      });
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  if (status.kind === "loading") {
    return page(
      <View
        style={{ alignItems: "center", flexDirection: "row", gap: space.sm }}
        accessible
        accessibilityLabel="Opening this session"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.indigo} />
        <Text variant="muted">Opening this session…</Text>
      </View>
    );
  }

  if (status.kind === "error") {
    return page(
      <Card>
        <Text variant="h2">We couldn’t open this session</Text>
        <Text variant="muted">
          Something interrupted it opening. Try again in a moment.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          <Button title="Try again" onPress={() => setAttempt((x) => x + 1)} />
          <Button kind="secondary" title="Tadabbur" onPress={leave} />
        </View>
      </Card>
    );
  }

  if (status.kind === "notfound") {
    return page(
      <Card>
        <Text variant="h2">This session isn’t here</Text>
        <Text variant="muted">This session couldn’t be found.</Text>
        <View style={{ alignItems: "flex-start" }}>
          <Button kind="secondary" title="Tadabbur" onPress={leave} />
        </View>
      </Card>
    );
  }

  return <SessionFlow key={status.session.id} session={status.session} />;
}

function SessionFlow({ session }: { session: TadabburSession }) {
  const reduce = useReducedMotion();
  const surahNames = useSurahNames();
  const [arabicScale] = useState(() => scaleFor(getSizeKey()));
  const [phase, setPhase] = useState(-1);
  const started = useRef(false);
  const { onFocusInput, page, toTop } = usePage(session.title);

  const saved = useMemo(() => getSessionProgress(session.id), [session.id]);
  const wasCompleted = sessionState(saved) === "completed";
  const stepCount = session.steps.length;
  const resumeStep = resumeStepFor(saved, stepCount);

  useEffect(() => {
    toTop();
  }, [phase, toTop]);

  // recordSessionStep never regresses: it keeps the furthest step reached.
  useEffect(() => {
    if (phase >= 0 && phase < stepCount) {
      recordSessionStep(session.id, phase);
    }
  }, [phase, stepCount, session.id]);

  function begin(at = 0) {
    if (!started.current) {
      track({ sessionId: session.id, type: "session_start" });
      started.current = true;
    }
    setPhase(at);
  }

  if (phase < 0) {
    return page(
      <>
        <FadeRise reduce={reduce} style={{ gap: space.sm }}>
          <Text variant="eyebrow">{session.theme}</Text>
          <Text variant="h1">{session.title}</Text>
          <Text variant="soft">{session.intro}</Text>
          <Text variant="muted">
            {stepCountLabel(stepCount)}, at your own pace.
          </Text>
          {wasCompleted ? (
            <Text variant="muted">You’ve sat with this one before.</Text>
          ) : null}
        </FadeRise>
        <FadeRise
          reduce={reduce}
          delay={reduce ? 0 : 60}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}
        >
          {resumeStep === null ? (
            <Button title="Begin" onPress={() => begin()} />
          ) : (
            <>
              <Button
                title={`Continue from step ${resumeStep + 1}`}
                onPress={() => begin(resumeStep)}
              />
              <Button
                kind="secondary"
                title="Start from the beginning"
                onPress={() => begin()}
              />
            </>
          )}
        </FadeRise>
      </>
    );
  }

  if (phase >= stepCount) {
    return page(
      <FinalScreen
        session={session}
        reduce={reduce}
        onFocusInput={onFocusInput}
        onDone={leave}
      />
    );
  }

  return page(
    <>
      <Text variant="eyebrow" accessibilityLiveRegion="polite">
        Step {phase + 1} of {stepCount}
      </Text>
      <FadeRise key={phase} reduce={reduce}>
        <StepView
          step={session.steps[phase]}
          surahNames={surahNames}
          arabicScale={arabicScale}
          reduce={reduce}
        />
      </FadeRise>
      <View
        style={{ flexDirection: "row", gap: space.md, marginTop: space.md }}
      >
        <Button
          kind="secondary"
          title="Back"
          onPress={() => setPhase((p) => Math.max(-1, p - 1))}
        />
        <Button
          title={phase + 1 === stepCount ? "Finish" : "Next"}
          onPress={() => setPhase((p) => p + 1)}
        />
      </View>
    </>
  );
}
