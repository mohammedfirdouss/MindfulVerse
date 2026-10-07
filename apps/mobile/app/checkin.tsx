// Daily check-in (web: apps/web/src/pages/CheckIn.tsx). Pushed from Home and
// the target of the daily-verse / welcome push (data.url "/checkin"), so it
// must stand on its own on a cold start.
import { useFocusEffect, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, TextInput, View } from "react-native";
import { track } from "@mindfulverse/core/analytics";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { loadAyahsByKeys, loadEmotions, loadSurahs } from "@mindfulverse/core/data";
import { addEntry } from "@mindfulverse/core/journal";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { Ayah, EmotionEntry } from "@mindfulverse/core/types";
import { AyahView } from "../src/components/CheckIn/AyahView";
import { readDraft, writeDraft } from "../src/components/CheckIn/draft";
import { useShareVerse } from "../src/share";
import { fonts, radius, space, type as typeScale, useTheme } from "../src/theme";
import { Button, Card, Screen, Text } from "../src/ui";

const VERSE_PROMPT = "What stays with you from this verse?";

export default function CheckIn() {
  const { colors } = useTheme();
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
  }

  const canSave = journalBody.trim().length > 0;

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

        {/* Verse of the day */}
        <Card>
          <Text variant="eyebrow">Verse of the day</Text>
          {dailyError ? (
            <Text variant="muted">
              Today’s verse is still being gathered. Come back in a little while and it will be
              waiting for you.
            </Text>
          ) : dailyAyah ? (
            <View style={{ gap: space.md }}>
              <AyahView ayah={dailyAyah} surahName={surahNames.get(dailyAyah.surah)} scale={scale} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Button
                  kind="secondary"
                  title={share.label ?? "Share this verse"}
                  accessibilityLabel={share.label ?? `Share verse ${dailyAyah.verseKey}`}
                  onPress={() => void share.share(dailyAyah)}
                />
              </View>
            </View>
          ) : (
            <Text variant="muted">Bringing today’s verse to you…</Text>
          )}

          <View
            style={{
              marginTop: 28 - space.md,
              paddingTop: space.lg,
              borderTopWidth: 1,
              borderTopColor: colors.line,
              gap: space.md,
            }}
          >
            <Text nativeID="checkin-journal-label" style={{ fontFamily: fonts.readSemiBold }}>
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
                minHeight: typeScale.body.lineHeight * 5 + 22,
                paddingVertical: 11,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: focused ? colors.indigo : colors.lineStrong,
                borderRadius: radius.sm,
                backgroundColor: colors.cotton,
                color: colors.ink,
                fontFamily: fonts.read,
                fontSize: typeScale.body.fontSize,
                lineHeight: typeScale.body.lineHeight,
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button title="Save" onPress={saveJournal} disabled={!canSave} />
              {saved ? (
                <Text variant="muted" accessibilityLiveRegion="polite" style={{ flex: 1, minWidth: 160 }}>
                  Kept in your journal. A new verse arrives tomorrow.
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Emotion picker — kept in the app's quiet indigo voice; kola stays
            reserved for small accents, never a whole section. */}
        <Card>
          <Text variant="eyebrow">How is your heart today?</Text>

          {emotionsError ? (
            <Text variant="muted">
              The reminders are still being gathered. Come back in a little while and they will be
              here.
            </Text>
          ) : emotions.length === 0 ? (
            <Text variant="muted">Gathering a few words for you…</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {emotions.map((entry) => {
                const isActive = entry.id === selectedId;
                return (
                  <Button
                    key={entry.id}
                    kind={isActive ? "primary" : "secondary"}
                    title={entry.label}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => selectEmotion(entry)}
                  />
                );
              })}
            </View>
          )}

          {selected ? (
            <View style={{ gap: space.md, marginTop: 6 }}>
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
                  <Card key={ayah.verseKey} style={{ backgroundColor: colors.cottonRaised }}>
                    <AyahView ayah={ayah} surahName={surahNames.get(ayah.surah)} scale={scale} />
                  </Card>
                ))
              )}
            </View>
          ) : null}
        </Card>

        {/* Opened cold from a push there is nothing to go back to. */}
        {!router.canGoBack() ? (
          <Button kind="ghost" title="Go to Home" onPress={() => router.navigate("/")} />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
