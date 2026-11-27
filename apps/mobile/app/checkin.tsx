import { track } from "@mindfulverse/core/analytics";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import {
  loadAyahsByKeys,
  loadEmotions,
  loadSurahs,
} from "@mindfulverse/core/data";
import {
  FEELING_TEXT_MAX,
  FEELING_TEXT_MIN,
  matchFeelings,
} from "@mindfulverse/core/feelingMatch";
import { addEntry, checkedInToday } from "@mindfulverse/core/journal";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import { useAccount } from "@mindfulverse/core/sync/auth";
import type { Ayah, EmotionEntry } from "@mindfulverse/core/types";
// Daily check-in (web: apps/web/src/pages/CheckIn.tsx). Pushed from Home and
// the target of the daily-verse / welcome push (data.url "/checkin"), so it
// must stand on its own on a cold start.
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { AyahView } from "../src/components/CheckIn/AyahView";
import { readDraft, writeDraft } from "../src/components/CheckIn/draft";
import { keepNote, openingStage } from "../src/components/CheckIn/flow";
import type { CheckInStage } from "../src/components/CheckIn/flow";
import { Reveal } from "../src/components/CheckIn/Reveal";
import { tapSuccess, tickSelection } from "../src/platform/haptics";
import { useShareVerse } from "../src/share";
import {
  fonts,
  radius,
  space,
  type as typeScale,
  useTheme,
} from "../src/theme";
import {
  AdireCloth,
  Button,
  Card,
  DyeRule,
  Screen,
  Text,
  useOnCloth,
} from "../src/ui";
import { useReducedMotion } from "../src/ui/FadeRise";

const VERSE_PROMPT = "What stays with you from this verse?";

/** Verses shown for a feeling before "Show more". */
const FIRST_VERSES = 3;

/** Pause in typing before the suggestions update. */
const MATCH_DEBOUNCE_MS = 250;

export default function CheckIn() {
  const { colors } = useTheme();
  const cloth = useOnCloth();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [scale, setScale] = useState(() => scaleFor(getSizeKey()));

  // Shared with the Home hero — one verse of the day across the app.
  const [dailyKey, setDailyKey] = useState<string | null>(null);
  const { user, loading: accountLoading } = useAccount();
  const accountId = user?.id ?? null;
  // Each person has their own verse; wait for the account so it doesn't flip.
  const refreshKey = useCallback(() => {
    if (!accountLoading) {
      void todayVerseKey(accountId).then(setDailyKey);
    }
  }, [accountId, accountLoading]);
  useFocusEffect(
    useCallback(() => {
      refreshKey();
      setScale(scaleFor(getSizeKey()));
    }, [refreshKey])
  );
  // An app left open past midnight should greet the new day's verse, not tag
  // a fresh reflection with yesterday's (web: visibilitychange).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        refreshKey();
      }
    });
    return () => sub.remove();
  }, [refreshKey]);

  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then(
        (list) =>
          alive && setSurahNames(new Map(list.map((x) => [x.number, x.name])))
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Verse of the day.
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [dailyError, setDailyError] = useState(false);

  // One thing at a time: the heart first, then the verse, then an optional
  // reflection. Already checked in today (or words left half written) opens
  // straight on the verse.
  const reduce = useReducedMotion();
  const [doneToday] = useState(() => checkedInToday());
  const [stage, setStage] = useState<CheckInStage>(() =>
    openingStage(doneToday, readDraft())
  );

  // Journal for the verse of the day. The draft is written on every change,
  // so nothing typed is lost to leaving the screen or the app being killed.
  const [journalBody, setJournalBody] = useState(readDraft);
  const [saved, setSaved] = useState(() => doneToday && !readDraft().trim());
  const [focused, setFocused] = useState(false);
  const [ownFocused, setOwnFocused] = useState(false);

  const share = useShareVerse("checkin");

  // Emotion picker.
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [emotionsError, setEmotionsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionAyahs, setEmotionAyahs] = useState<Ayah[]>([]);
  const [emotionAyahsError, setEmotionAyahsError] = useState(false);
  // Three verses keep the screen calm; the rest wait behind "Show more".
  const [showAllVerses, setShowAllVerses] = useState(false);
  const [emotionLoading, setEmotionLoading] = useState(false);
  // Only the latest emotion tap may fill the list — a slow earlier fetch must
  // not land under a newer framing.
  const emotionReq = useRef(0);

  // A feeling in the reader's own words (web: CheckIn.tsx). It is matched on
  // the device against the chips and never sent, saved or tracked; only a
  // tapped chip's id is.
  const [ownWords, setOwnWords] = useState("");
  const [settledWords, setSettledWords] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setSettledWords(ownWords), MATCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [ownWords]);
  const suggestions = useMemo(() => {
    const byId = new Map(emotions.map((e) => [e.id, e]));
    return matchFeelings(settledWords, [...byId.keys()]).flatMap((m) => {
      const entry = byId.get(m.id);
      return entry ? [entry] : [];
    });
  }, [emotions, settledWords]);
  const noMatch =
    suggestions.length === 0 && settledWords.trim().length >= FEELING_TEXT_MIN;

  useEffect(() => {
    track({ type: "checkin_view" });
  }, []);

  useEffect(() => {
    if (!dailyKey) {
      return;
    }
    let alive = true;
    setDailyError(false);
    loadAyahsByKeys([dailyKey])
      .then((ayahs) => {
        if (!alive) {
          return;
        }
        setDailyAyah(ayahs[0] ?? null);
        if (!ayahs[0]) {
          setDailyError(true);
        }
      })
      .catch(() => {
        if (alive) {
          setDailyError(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [dailyKey]);

  useEffect(() => {
    let alive = true;
    loadEmotions()
      .then((list) => alive && setEmotions(list))
      .catch(() => alive && setEmotionsError(true));
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => emotions.find((e) => e.id === selectedId) ?? null,
    [emotions, selectedId]
  );

  function selectEmotion(entry: EmotionEntry): void {
    if (entry.id !== selectedId) {
      tickSelection();
    }
    setStage("verse");
    setSelectedId(entry.id);
    setEmotionAyahs([]);
    setEmotionAyahsError(false);
    setShowAllVerses(false);
    setEmotionLoading(true);
    track({ emotion: entry.id, type: "checkin_view" });
    const req = ++emotionReq.current;
    loadAyahsByKeys(entry.verseKeys)
      .then((ayahs) => {
        if (req !== emotionReq.current) {
          return;
        }
        setEmotionAyahs(ayahs);
        setEmotionLoading(false);
      })
      .catch(() => {
        if (req !== emotionReq.current) {
          return;
        }
        setEmotionAyahsError(true);
        setEmotionLoading(false);
      });
  }

  function saveJournal(): void {
    const body = journalBody.trim();
    if (!body) {
      return;
    }
    addEntry({
      prompt: VERSE_PROMPT,
      body,
      // ref carries the verse this reflection was written about, so the
      // journal can show the ayah alongside the entry.
      context: { kind: "checkin", ref: dailyAyah?.verseKey },
    });
    track({ context: "checkin", type: "journal_save" });
    setJournalBody("");
    writeDraft("");
    setSaved(true);
    tapSuccess();
  }

  const atVerse = stage === "verse";
  const note = keepNote(journalBody, saved);
  const canSave = note === "draft";
  const sectionHeading = {
    color: colors.indigoDeep,
    fontFamily: fonts.readSemiBold,
    fontSize: 20,
    letterSpacing: -0.2,
    lineHeight: 27,
  } as const;

  return (
    <KeyboardAvoidingView
      style={{ backgroundColor: colors.cotton, flex: 1 }}
      behavior="padding"
      // The header sits above this view; edge-to-edge Android does not resize
      // the window for the keyboard, so both platforms need the offset.
      keyboardVerticalOffset={headerHeight}
    >
      <Screen edges="bottom">
        <View>
          <Text variant="h1">
            {atVerse ? "A quiet moment" : "How is your heart today?"}
          </Text>
          {atVerse ? null : (
            <Text
              variant="soft"
              style={{ fontSize: 17, lineHeight: 25, marginTop: space.sm }}
            >
              Tap a word if one fits.
            </Text>
          )}
        </View>

        {/* The heart: one tap, optional, with room to say it in other words. Once the verse is open
            the chips stay at the top, compact, so a feeling can always be
            changed. Chips follow the reader's Segmented control: outlined,
            the chosen one indigo. */}
        <View
          style={{
            gap: atVerse ? space.sm : space.md,
            marginTop: atVerse ? 0 : space.sm,
          }}
        >
          {atVerse ? (
            <Text
              accessibilityRole="header"
              style={{
                color: colors.inkSoft,
                fontFamily: fonts.readSemiBold,
                fontSize: 15,
                lineHeight: 21,
              }}
            >
              How is your heart today?
            </Text>
          ) : null}

          {emotionsError ? (
            <Text variant="muted">Not ready yet. Try again shortly.</Text>
          ) : emotions.length === 0 ? (
            <Text variant="muted">Gathering a few words for you…</Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: atVerse ? 6 : space.sm,
              }}
            >
              {emotions.map((entry) => {
                const isActive = entry.id === selectedId;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => selectEmotion(entry)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: isActive
                        ? colors.indigo
                        : pressed
                          ? colors.indigoWash
                          : colors.cottonRaised,
                      borderColor: isActive ? colors.indigo : colors.lineStrong,
                      borderRadius: 999,
                      borderWidth: 1,
                      justifyContent: "center",
                      minHeight: 44,
                      paddingHorizontal: atVerse ? 12 : space.md,
                      transform: [{ scale: pressed && !reduce ? 0.97 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.cotton : colors.inkSoft,
                        fontFamily: isActive ? fonts.readSemiBold : fonts.read,
                        fontSize: atVerse ? 15 : 16,
                        lineHeight: 21,
                      }}
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {emotions.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <Text
                nativeID="checkin-own-label"
                style={{
                  color: colors.inkSoft,
                  fontFamily: fonts.readSemiBold,
                  fontSize: 15,
                  lineHeight: 21,
                }}
              >
                Or describe it in your own words
              </Text>
              <TextInput
                accessibilityLabel="Or describe it in your own words"
                accessibilityLabelledBy="checkin-own-label"
                accessibilityHint="Suggests a feeling to tap. Your words stay on this device."
                value={ownWords}
                onChangeText={setOwnWords}
                onFocus={() => setOwnFocused(true)}
                onBlur={() => setOwnFocused(false)}
                maxLength={FEELING_TEXT_MAX}
                placeholder="I feel…"
                placeholderTextColor={colors.inkFaint}
                autoComplete="off"
                autoCorrect
                importantForAutofill="no"
                returnKeyType="done"
                style={{
                  backgroundColor: colors.cottonRaised,
                  borderColor: ownFocused ? colors.indigo : colors.lineStrong,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  color: colors.ink,
                  fontFamily: fonts.read,
                  fontSize: typeScale.body.fontSize,
                  minHeight: 44,
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                }}
              />
              <View accessibilityLiveRegion="polite" style={{ gap: space.sm }}>
                {suggestions.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: space.sm,
                    }}
                  >
                    {suggestions.map((entry) => (
                      <Pressable
                        key={entry.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Sounds like: ${entry.label}`}
                        onPress={() => selectEmotion(entry)}
                        style={({ pressed }) => ({
                          alignItems: "center",
                          backgroundColor: pressed
                            ? colors.indigoWash
                            : colors.cottonRaised,
                          borderColor: colors.lineStrong,
                          borderRadius: 999,
                          borderWidth: 1,
                          justifyContent: "center",
                          minHeight: 44,
                          paddingHorizontal: space.md,
                          transform: [{ scale: pressed && !reduce ? 0.97 : 1 }],
                        })}
                      >
                        <Text
                          style={{
                            color: colors.inkSoft,
                            fontFamily: fonts.read,
                            fontSize: 16,
                            lineHeight: 21,
                          }}
                        >
                          Sounds like: {entry.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {noMatch ? (
                  <Text
                    variant="muted"
                    style={{ fontSize: 15, lineHeight: 21 }}
                  >
                    No close match. Pick the feeling that’s nearest above.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {atVerse ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStage("verse")}
              hitSlop={{ bottom: 4, left: 8, right: 8, top: 4 }}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                justifyContent: "center",
                marginTop: space.xs,
                minHeight: 44,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.indigo,
                  fontFamily: fonts.read,
                  fontSize: 16,
                  lineHeight: 22,
                  textDecorationLine: "underline",
                }}
              >
                Just show me today’s verse
              </Text>
            </Pressable>
          )}
        </View>

        {atVerse ? (
          <Reveal reduce={reduce} style={{ gap: space.lg }}>
            {/* Verse of the day: the anchor, laid on the dyed cloth, as Home's
                surah lead card is. */}
            <AdireCloth style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
              {dailyError ? (
                <Text style={{ color: cloth.soft, marginTop: 10 }}>
                  Today’s verse isn’t ready yet. Try again shortly.
                </Text>
              ) : dailyAyah ? (
                <AyahView
                  ayah={dailyAyah}
                  surahName={surahNames.get(dailyAyah.surah)}
                  scale={scale}
                  onCloth
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        share.label ?? `Share verse ${dailyAyah.verseKey}`
                      }
                      onPress={() => void share.share(dailyAyah)}
                      hitSlop={{ bottom: 4, left: 8, right: 8, top: 4 }}
                      style={({ pressed }) => ({
                        justifyContent: "center",
                        minHeight: 44,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: cloth.strong,
                          fontFamily: fonts.readSemiBold,
                          fontSize: 15,
                          lineHeight: 20,
                          textDecorationLine: "underline",
                        }}
                      >
                        {share.label ?? "Share this verse"}
                      </Text>
                    </Pressable>
                  }
                />
              ) : (
                <Text style={{ color: cloth.soft, marginTop: 10 }}>
                  Bringing today’s verse to you…
                </Text>
              )}
            </AdireCloth>

            {/* The feeling's verses: a gentle follow-on beneath the anchor. */}
            {selected ? (
              <Reveal
                key={selected.id}
                reduce={reduce}
                style={{ gap: space.md, marginTop: space.sm }}
              >
                <Text
                  variant="h2"
                  style={{ color: colors.ink, fontSize: 18.7, lineHeight: 26 }}
                >
                  {selected.framing}
                </Text>
                {emotionAyahsError ? (
                  <Text variant="muted">Not ready yet. Try again shortly.</Text>
                ) : emotionLoading ? (
                  <Text variant="muted">Gathering a few verses…</Text>
                ) : (
                  <>
                    {emotionAyahs
                      .slice(0, showAllVerses ? undefined : FIRST_VERSES)
                      .map((ayah, i) => (
                        <Reveal
                          key={ayah.verseKey}
                          reduce={reduce}
                          delay={Math.min(
                            (i < FIRST_VERSES ? i : i - FIRST_VERSES) * 40,
                            120
                          )}
                        >
                          <Card>
                            <AyahView
                              ayah={ayah}
                              surahName={surahNames.get(ayah.surah)}
                              scale={scale}
                            />
                          </Card>
                        </Reveal>
                      ))}
                    {!showAllVerses && emotionAyahs.length > FIRST_VERSES ? (
                      <View style={{ alignItems: "flex-start" }}>
                        <Button
                          kind="ghost"
                          title={`Show ${emotionAyahs.length - FIRST_VERSES} more ${
                            emotionAyahs.length - FIRST_VERSES === 1
                              ? "verse"
                              : "verses"
                          }`}
                          accessibilityState={{ expanded: false }}
                          onPress={() => setShowAllVerses(true)}
                        />
                      </View>
                    ) : null}
                  </>
                )}
              </Reveal>
            ) : null}

            <DyeRule style={{ marginVertical: space.sm }} />

            {/* An optional reflection, last, on the open cotton. */}
            <View style={{ gap: space.md }}>
              <View style={{ gap: space.xs }}>
                <Text nativeID="checkin-journal-label" style={sectionHeading}>
                  {VERSE_PROMPT}
                </Text>
                <Text variant="muted" style={{ fontSize: 15, lineHeight: 21 }}>
                  A line is plenty.
                </Text>
              </View>
              <TextInput
                accessibilityLabel={VERSE_PROMPT}
                accessibilityLabelledBy="checkin-journal-label"
                accessibilityHint="Optional. Your words are kept as a draft while you write."
                value={journalBody}
                onChangeText={(v) => {
                  setJournalBody(v);
                  writeDraft(v);
                  if (saved) {
                    setSaved(false);
                  }
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Write as much or as little as you like…"
                placeholderTextColor={colors.inkFaint}
                multiline
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.cottonRaised,
                  borderColor: focused ? colors.indigo : colors.lineStrong,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  color: colors.ink,
                  fontFamily: fonts.read,
                  fontSize: typeScale.body.fontSize,
                  lineHeight: typeScale.body.lineHeight,
                  minHeight: typeScale.body.lineHeight * 5 + space.xl,
                  paddingHorizontal: space.md,
                  paddingVertical: space.md,
                }}
              />
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: space.md,
                }}
              >
                <Button
                  title="Keep in journal"
                  onPress={saveJournal}
                  disabled={!canSave}
                />
                {note === "draft" ? (
                  <Text
                    variant="muted"
                    style={{ fontSize: 14.5, lineHeight: 20 }}
                  >
                    Draft kept
                  </Text>
                ) : null}
                <Text
                  variant="soft"
                  role="status"
                  accessibilityLiveRegion="polite"
                  style={{ fontSize: 15.5, lineHeight: 22 }}
                >
                  {note === "kept" ? "Kept in your journal ✓" : ""}
                </Text>
              </View>
            </View>
          </Reveal>
        ) : null}

        {/* Opened cold from a push there is nothing to go back to. */}
        {router.canGoBack() ? null : (
          <Button
            kind="ghost"
            title="Go to Home"
            onPress={() => router.navigate("/")}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
