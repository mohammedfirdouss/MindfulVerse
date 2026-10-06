// Surah tadabbur: ponder a surah one verse at a time. Port of web's
// pages/SurahTadabbur.tsx (same flow, copy, progress and analytics).
//
// This is the reminder push target: data.url = "/tadabbur/{surah}?v={ayah}".
// On a cold start from a notification the params are there on first render;
// the surah loads async (loading state), then `?v=` jumps straight to that
// verse, exactly as web does. A later `?v=` change (a second tap while the
// screen is open) jumps again.
//
// Phases: -1 = about the surah, 0..count-1 = a verse, count = completion.
import { track } from "@mindfulverse/core/analytics";
import {
  loadSurahAyahs,
  loadSurahInfo,
  loadSurahs,
  loadSurahTafsir,
  loadTafsirIndex,
} from "@mindfulverse/core/data";
import { getSurahTadabbur, recordSurahTadabbur } from "@mindfulverse/core/progress";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { Ayah, SurahInfo, SurahMeta, SurahTafsir } from "@mindfulverse/core/types";
import { router, Stack, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useHeaderHeight, usePreventRemove } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  View,
  type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeRise, useReducedMotion } from "../../src/components/Tadabbur/FadeRise";
import { InfoText } from "../../src/components/Tadabbur/InfoText";
import {
  coveringFromIndex,
  deepLinkPhase,
  EMPTY_DRAFT,
  hasText,
  parseSurahParam,
  resumeAyahFor,
  verseCount,
  type Draft,
} from "../../src/components/Tadabbur/logic";
import { ReflectionArea } from "../../src/components/Tadabbur/ReflectionArea";
import { useShareVerse } from "../../src/components/Tadabbur/useShareVerse";
import { VerseCommentary } from "../../src/components/Tadabbur/VerseCommentary";
import { VersePicker } from "../../src/components/Tadabbur/VersePicker";
import { fonts, space, useTheme } from "../../src/theme";
import { ArabicText, Button, Card, Text } from "../../src/ui";

type LoadStatus = "loading" | "ready" | "error";

// Keyed on the surah so "Next surah" starts from clean state: no stale ayahs,
// in-flight tafsir or drafts carried over from the previous surah.
export default function Tadabbur() {
  const { surah } = useLocalSearchParams<{ surah: string; v?: string }>();
  return <TadabburPage key={String(surah)} />;
}

/** Leave the flow: back to wherever it was opened from, or Home when the
 *  screen is the stack root (opened straight from a notification). */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function TadabburPage() {
  const params = useLocalSearchParams<{ surah: string; v?: string }>();
  const surahNumber = parseSurahParam(params.surah);
  const validSurah = surahNumber !== null;
  const n = surahNumber ?? 0;

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const reduce = useReducedMotion();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [indexed, setIndexed] = useState<number[]>([]);
  const [indexFailed, setIndexFailed] = useState(false);
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [info, setInfo] = useState<SurahInfo | null>(null);
  const [tafsir, setTafsir] = useState<SurahTafsir | null>(null);
  const tafsirPromise = useRef<Promise<SurahTafsir> | null>(null);

  const [phase, setPhase] = useState(-1);
  const started = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [arabicScale, setArabicScale] = useState(() => scaleFor(getSizeKey()));

  // Drafts live in a ref (the inputs own their state; see ReflectionArea), so
  // typing never re-renders the verse. Only the "anything unsaved?" bit is state.
  const drafts = useRef<Record<string, Draft>>({});
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const onDraft = useCallback((verseKey: string, d: Draft) => {
    drafts.current[verseKey] = d;
    const any = Object.values(drafts.current).some(hasText);
    setHasUnsaved((prev) => (prev === any ? prev : any));
  }, []);

  // Re-read on every phase change so returning to the about screen offers the
  // latest resume point, not the one from when the screen opened.
  const saved = useMemo(
    () => (validSurah ? getSurahTadabbur(n) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validSurah, n, phase],
  );

  // The reader's A/A/A size may change while this screen is underneath.
  useFocusEffect(
    useCallback(() => {
      setArabicScale(scaleFor(getSizeKey()));
    }, []),
  );

  useEffect(() => {
    if (!validSurah) return;
    let active = true;
    setStatus("loading");
    Promise.all([
      loadSurahAyahs(n),
      loadTafsirIndex().catch<Record<string, number[]> | null>(() => null),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, indexData, surahList]) => {
        if (!active) return;
        setAyahs(ayahData);
        setIndexed(indexData?.[String(n)] ?? []);
        setIndexFailed(indexData === null);
        setMeta(surahList.find((s) => s.number === n));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    loadSurahInfo(n)
      .then((d) => {
        if (active && d) setInfo(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [validSurah, n, attempt]);

  const name = meta?.name ?? `Surah ${n}`;
  const count = ayahs.length;

  const begin = useCallback(
    (at: number) => {
      if (!started.current) {
        track({ type: "session_start", sessionId: `surah-${n}` });
        started.current = true;
      }
      setPhase(at);
    },
    [n],
  );

  // Deep link (?v=n): start straight at that verse once the surah loads.
  // Keyed on the param's value, so each new `v` is honoured once.
  const handledV = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready") return;
    const key = String(params.v ?? "");
    if (handledV.current === key) return;
    handledV.current = key;
    const at = deepLinkPhase(params.v, count);
    if (at !== null) begin(at);
  }, [status, params.v, count, begin]);

  // Remember the furthest verse pondered (recordSurahTadabbur never regresses).
  useEffect(() => {
    if (status !== "ready" || phase < 0 || count === 0) return;
    const a = ayahs[Math.min(phase, count - 1)];
    if (a.surah !== n) return;
    recordSurahTadabbur(n, a.ayah);
  }, [phase, status, ayahs, count, n]);

  // Each verse starts at the top: Next sits below the reflection area.
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [phase]);

  // Keep the focused reflection input above the keyboard.
  const focused = useRef<TextInput | null>(null);
  const revealFocused = useCallback(() => {
    const input = focused.current;
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - space.xxl * 2), animated: true }),
      () => {},
    );
  }, []);
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", revealFocused);
    return () => sub.remove();
  }, [revealFocused]);
  const onFocusInput = useCallback(
    (input: TextInput) => {
      focused.current = input;
      if (Keyboard.isVisible()) revealFocused();
    },
    [revealFocused],
  );

  // Leaving with an unsaved reflection asks first (web: a second tap on
  // "All tadabbur"). Covers the header back, Android back and router calls.
  usePreventRemove(hasUnsaved, ({ data }) => {
    Alert.alert(
      "Leave without saving?",
      "You have an unsaved reflection on this surah.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => navigation.dispatch(data.action) },
      ],
      { cancelable: true },
    );
  });

  /** Fetch the surah's tafsir once, on first request. */
  const ensureTafsir = useCallback(() => {
    if (tafsirPromise.current) return;
    tafsirPromise.current = loadSurahTafsir(n)
      .then((t) => {
        setTafsir(t);
        return t;
      })
      .catch(() => {
        tafsirPromise.current = null;
        const empty: SurahTafsir = {};
        setTafsir(empty);
        return empty;
      });
  }, [n]);

  const pickVerse = useCallback(
    (ayah: number) => {
      setPickerOpen(false);
      begin(ayah - 1);
    },
    [begin],
  );
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const share = useShareVerse("tadabbur");

  const title = <Stack.Screen options={{ title: validSurah && status === "ready" ? name : "Tadabbur" }} />;

  const page = (children: ReactNode) => (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cotton }}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      {title}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: insets.bottom + space.xxl,
        }}
      >
        <View ref={contentRef} collapsable={false} style={{ gap: space.md }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (!validSurah) {
    return page(
      <Card>
        <Text variant="h2">That surah isn’t here</Text>
        <Text variant="muted">
          Surahs run from 1 to 114 — we couldn’t find the one this link points to.
        </Text>
        <View style={{ alignItems: "flex-start" }}>
          <Button kind="secondary" title="Go back" onPress={leave} />
        </View>
      </Card>,
    );
  }

  if (status === "loading") {
    return page(
      <View
        style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}
        accessible
        accessibilityLabel="Opening the surah"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.indigo} />
        <Text variant="muted">Opening the surah…</Text>
      </View>,
    );
  }

  if (status === "error" || count === 0) {
    return page(
      <Card>
        <Text variant="h2">We couldn’t open this surah</Text>
        <Text variant="muted">
          Something interrupted it opening. Try again in a moment.
        </Text>
        <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
          <Button title="Try again" onPress={() => setAttempt((x) => x + 1)} />
          <Button kind="secondary" title="Go back" onPress={leave} />
        </View>
      </Card>,
    );
  }

  // About screen: background first, then the way in.
  if (phase < 0) {
    const resumeAyah = resumeAyahFor(saved, count);
    return page(
      <>
        <FadeRise reduce={reduce} style={{ gap: space.sm }}>
          <Text variant="eyebrow">Tadabbur</Text>
          <Text variant="h1">{name}</Text>
          <Text variant="muted">{verseCount(count)}, one at a time.</Text>
        </FadeRise>
        {info ? (
          <FadeRise reduce={reduce} delay={60}>
            <Card>
              <Text variant="eyebrow" accessibilityRole="header">
                About this surah
              </Text>
              <InfoText text={info.text} />
            </Card>
          </FadeRise>
        ) : null}
        <FadeRise reduce={reduce} delay={120} style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
          {resumeAyah != null ? (
            <>
              <Button title={`Continue from verse ${resumeAyah}`} onPress={() => begin(resumeAyah - 1)} />
              <Button kind="ghost" title="Start from verse 1" onPress={() => begin(0)} />
            </>
          ) : (
            <Button title="Begin pondering" onPress={() => begin(0)} />
          )}
        </FadeRise>
      </>,
    );
  }

  // Completion screen.
  if (phase >= count) {
    return page(
      <>
        <FadeRise reduce={reduce} style={{ gap: space.sm }}>
          <Text variant="eyebrow">Tadabbur</Text>
          <Text variant="h1">You’ve sat with all of {name}.</Text>
          <Text variant="soft">
            {verseCount(count)}, pondered at your own pace. May what you wrote stay with you.
          </Text>
        </FadeRise>
        <FadeRise reduce={reduce} delay={60} style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
          {n < 114 ? (
            <Button
              title="Next surah"
              onPress={() => router.replace({ pathname: "/tadabbur/[surah]", params: { surah: String(n + 1) } })}
            />
          ) : null}
          <Button kind="secondary" title="Done" onPress={leave} />
        </FadeRise>
      </>,
    );
  }

  // One verse per step.
  const a = ayahs[phase];
  const covering = coveringFromIndex(indexed, a.ayah);

  return page(
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <Text variant="eyebrow" accessibilityLiveRegion="polite">
          Verse {phase + 1} of {count}
        </Text>
        <Button
          kind="ghost"
          title="Go to a verse"
          accessibilityHint="Opens a list of every verse in this surah"
          onPress={() => setPickerOpen(true)}
        />
      </View>

      <FadeRise key={phase} reduce={reduce} style={{ gap: space.md }}>
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm + 2 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                borderWidth: 1.5,
                borderColor: colors.indigo,
                alignItems: "center",
                justifyContent: "center",
              }}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 14, lineHeight: 18, color: colors.indigo }}>
                {a.ayah}
              </Text>
            </View>
            <Text variant="eyebrow">
              {name} · {a.verseKey}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          </View>
          <ArabicText scale={arabicScale} selectable accessibilityLanguage="ar">
            {a.arabic}
          </ArabicText>
          <Text variant="translation" selectable>
            {a.translation}
          </Text>
          <View style={{ alignItems: "flex-start" }}>
            <Button
              kind="ghost"
              title={share.label ?? "Share"}
              accessibilityLabel={share.label ?? `Share verse ${a.verseKey}`}
              onPress={() => void share.share(a)}
            />
          </View>
        </View>

        <VerseCommentary
          key={a.verseKey}
          ayah={a}
          covering={covering}
          ensureTafsir={ensureTafsir}
          tafsir={tafsir}
          indexUnavailable={indexFailed}
        />

        <ReflectionArea
          key={`r-${a.verseKey}`}
          verseKey={a.verseKey}
          name={name}
          initial={drafts.current[a.verseKey] ?? EMPTY_DRAFT}
          onDraft={onDraft}
          onFocusInput={onFocusInput}
        />
      </FadeRise>

      <View style={{ flexDirection: "row", gap: space.md }}>
        <Button kind="secondary" title="Back" onPress={() => setPhase((p) => Math.max(-1, p - 1))} />
        <Button title={phase + 1 === count ? "Finish" : "Next verse"} onPress={() => setPhase((p) => p + 1)} />
      </View>

      <VersePicker
        visible={pickerOpen}
        ayahs={ayahs}
        currentAyah={a.ayah}
        onPick={pickVerse}
        onClose={closePicker}
      />
    </>,
  );
}
