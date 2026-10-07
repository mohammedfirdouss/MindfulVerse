// Daily check-in (web: apps/web/src/pages/CheckIn.tsx). Pushed from Home and
// the target of the daily-verse / welcome push (data.url "/checkin"), so it
// must stand on its own on a cold start.
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Pressable, TextInput, View } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { loadAyahsByKeys, loadEmotions, loadSurahs } from "@mindfulverse/core/data";
import { addEntry } from "@mindfulverse/core/journal";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { Ayah, EmotionEntry } from "@mindfulverse/core/types";
import { AyahView } from "../src/components/CheckIn/AyahView";
import { readDraft, writeDraft } from "../src/components/CheckIn/draft";
import { tapSuccess, tickSelection } from "../src/platform/haptics";
import { useShareVerse } from "../src/share";
import { fonts, radius, space, type as typeScale, useTheme } from "../src/theme";
import { AdireCloth, Button, Card, DyeRule, Screen, Text, useOnCloth } from "../src/ui";

const VERSE_PROMPT = "What stays with you from this verse?";

export default function CheckIn() {
  const { colors } = useTheme();
  const cloth = useOnCloth();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [scale, setScale] = useState(() => scaleFor(getSizeKey()));

  // Shared with the Home hero — one verse of the day across the app.
  const [dailyKey, setDailyKey] = useState<string | null>(null);
  const refreshKey = useCallback(() => {
    void todayVerseKey().then(setDailyKey);
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshKey();
      setScale(scaleFor(getSizeKey()));
    }, [refreshKey]),
  );
  // An app left open past midnight should greet the new day's verse, not tag
  // a fresh reflection with yesterday's (web: visibilitychange).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refreshKey();
    });
    return () => sub.remove();
  }, [refreshKey]);

  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());
  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => alive && setSurahNames(new Map(list.map((x) => [x.number, x.name]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Verse of the day.
  const [dailyAyah, setDailyAyah] = useState<Ayah | null>(null);
  const [dailyError, setDailyError] = useState(false);

  // Journal for the verse of the day.
  const [journalBody, setJournalBody] = useState(readDraft);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);

  const share = useShareVerse("checkin");

  // Emotion picker.
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [emotionsError, setEmotionsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emotionAyahs, setEmotionAyahs] = useState<Ayah[]>([]);
  const [emotionAyahsError, setEmotionAyahsError] = useState(false);
  const [emotionLoading, setEmotionLoading] = useState(false);
  // Only the latest emotion tap may fill the list — a slow earlier fetch must
  // not land under a newer framing.
  const emotionReq = useRef(0);

  useEffect(() => {
    track({ type: "checkin_view" });
  }, []);

  useEffect(() => {
    if (!dailyKey) return;
    let alive = true;
    setDailyError(false);
    loadAyahsByKeys([dailyKey])
      .then((ayahs) => {
        if (!alive) return;
        setDailyAyah(ayahs[0] ?? null);
        if (!ayahs[0]) setDailyError(true);
      })
      .catch(() => {
        if (alive) setDailyError(true);
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
    [emotions, selectedId],
  );

  function selectEmotion(entry: EmotionEntry): void {
    if (entry.id !== selectedId) tickSelection();
    setSelectedId(entry.id);
    setEmotionAyahs([]);
    setEmotionAyahsError(false);
    setEmotionLoading(true);
    track({ type: "checkin_view", emotion: entry.id });
    const req = ++emotionReq.current;
    loadAyahsByKeys(entry.verseKeys)
      .then((ayahs) => {
        if (req !== emotionReq.current) return;
        setEmotionAyahs(ayahs);
        setEmotionLoading(false);
      })
      .catch(() => {
        if (req !== emotionReq.current) return;
        setEmotionAyahsError(true);
        setEmotionLoading(false);
      });
  }

  function saveJournal(): void {
    const body = journalBody.trim();
    if (!body) return;
    addEntry({
      prompt: VERSE_PROMPT,
      body,
      // ref carries the verse this reflection was written about, so the
      // journal can show the ayah alongside the entry.
      context: { kind: "checkin", ref: dailyAyah?.verseKey },
    });
    track({ type: "journal_save", context: "checkin" });
    setJournalBody("");
    writeDraft("");
    setSaved(true);
    tapSuccess();
  }

  const canSave = journalBody.trim().length > 0;
  const sectionHeading = {
    fontFamily: fonts.readSemiBold,
    fontSize: 20,
    lineHeight: 27,
    color: colors.indigoDeep,
    letterSpacing: -0.2,
  } as const;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.cotton }}
      behavior="padding"
      // The header sits above this view; edge-to-edge Android does not resize
      // the window for the keyboard, so both platforms need the offset.
      keyboardVerticalOffset={headerHeight}
    >
      <Screen edges="bottom">
        <View>
          <Text variant="eyebrow">Daily check-in</Text>
          <Text variant="h1">A quiet moment</Text>
        </View>

        {/* Verse of the day: the verse that matters, so it is laid on the
            dyed cloth, as Home's hero is. */}
        <AdireCloth style={{ padding: space.lg, paddingTop: 20, marginTop: space.xs }}>
          <Text
            style={{
              fontFamily: fonts.readSemiBold,
              fontSize: 13,
              lineHeight: 18,
              color: cloth.accent,
              letterSpacing: 1.2,
            }}
          >
            VERSE OF THE DAY
          </Text>
          {dailyError ? (
            <Text style={{ color: cloth.soft, marginTop: 10 }}>
              Today’s verse is still being gathered. Come back in a little while and it will be
              waiting for you.
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
                  accessibilityLabel={share.label ?? `Share verse ${dailyAyah.verseKey}`}
                  onPress={() => void share.share(dailyAyah)}
                  hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontFamily: fonts.readSemiBold,
                      fontSize: 15,
                      lineHeight: 20,
                      color: cloth.strong,
                      textDecorationLine: "underline",
                    }}
                  >
                    {share.label ?? "Share this verse"}
                  </Text>
                </Pressable>
              }
            />
          ) : (
            <Text style={{ color: cloth.soft, marginTop: 10 }}>Bringing today’s verse to you…</Text>
          )}
        </AdireCloth>

        <DyeRule style={{ marginVertical: space.sm }} />

        {/* Reflection on the verse, on the open cotton. */}
        <View style={{ gap: space.md }}>
          <Text nativeID="checkin-journal-label" style={sectionHeading}>
            {VERSE_PROMPT}
          </Text>
          <TextInput
            accessibilityLabel={VERSE_PROMPT}
            accessibilityLabelledBy="checkin-journal-label"
            value={journalBody}
            onChangeText={(v) => {
              setJournalBody(v);
              writeDraft(v);
              if (saved) setSaved(false);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write as much or as little as you like…"
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: typeScale.body.lineHeight * 6 + space.xl,
              paddingVertical: space.md,
              paddingHorizontal: space.md,
              borderWidth: 1,
              borderColor: focused ? colors.indigo : colors.lineStrong,
              borderRadius: radius.md,
              backgroundColor: colors.cottonRaised,
              color: colors.ink,
              fontFamily: fonts.read,
              fontSize: typeScale.body.fontSize,
              lineHeight: typeScale.body.lineHeight,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" }}>
            <Button title="Save" onPress={saveJournal} disabled={!canSave} style={{ minWidth: 112 }} />
            {saved ? (
              <Text variant="soft" accessibilityLiveRegion="polite" style={{ flex: 1, minWidth: 160, fontSize: 15.5, lineHeight: 22 }}>
                Kept in your journal. A new verse arrives tomorrow.
              </Text>
            ) : null}
          </View>
        </View>

        <DyeRule style={{ marginVertical: space.sm }} />

        {/* Emotion picker — kept in the app's quiet indigo voice; kola stays
            reserved for small accents, never a whole section. Chips follow
            the reader's Segmented control: outlined, the chosen one indigo. */}
        <View style={{ gap: space.md }}>
          <Text style={sectionHeading}>How is your heart today?</Text>

          {emotionsError ? (
            <Text variant="muted">
              The reminders are still being gathered. Come back in a little while and they will be
              here.
            </Text>
          ) : emotions.length === 0 ? (
            <Text variant="muted">Gathering a few words for you…</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {emotions.map((entry) => {
                const isActive = entry.id === selectedId;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => selectEmotion(entry)}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      paddingHorizontal: space.md,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      borderColor: isActive ? colors.indigo : colors.lineStrong,
                      backgroundColor: isActive
                        ? colors.indigo
                        : pressed
                          ? colors.indigoWash
                          : colors.cottonRaised,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <Text
                      style={{
                        fontFamily: isActive ? fonts.readSemiBold : fonts.read,
                        fontSize: 16,
                        lineHeight: 21,
                        color: isActive ? colors.cotton : colors.inkSoft,
                      }}
                    >
                      {entry.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selected ? (
            <View style={{ gap: space.md, marginTop: space.sm }}>
              <Text variant="h2" style={{ fontSize: 18.7, lineHeight: 26, color: colors.ink }}>
                {selected.framing}
              </Text>
              {emotionAyahsError ? (
                <Text variant="muted">
                  These verses are still being gathered. Come back in a little while and they will
                  be here for you.
                </Text>
              ) : emotionLoading ? (
                <Text variant="muted">Gathering a few verses…</Text>
              ) : (
                emotionAyahs.map((ayah) => (
                  <Card key={ayah.verseKey}>
                    <AyahView ayah={ayah} surahName={surahNames.get(ayah.surah)} scale={scale} />
                  </Card>
                ))
              )}
            </View>
          ) : null}
        </View>

        {/* Opened cold from a push there is nothing to go back to. */}
        {!router.canGoBack() ? (
          <Button kind="ghost" title="Go to Home" onPress={() => router.navigate("/")} />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
