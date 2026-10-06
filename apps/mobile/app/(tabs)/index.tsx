// Home (web: apps/web/src/pages/Home.tsx): greeting, streak, the verse of the
// day, the check-in / go-deeper action, and the places to go with more time.
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { loadAyahsByKeys, loadSurahs } from "@mindfulverse/core/data";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { checkedInToday } from "@mindfulverse/core/journal";
import { currentStreak, getLastRead, latestSurahTadabbur } from "@mindfulverse/core/progress";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { Ayah } from "@mindfulverse/core/types";
import { HomeEntry } from "../../src/components/Home/HomeEntry";
import {
  deeperLabel,
  greeting,
  readDesc,
  streakLine,
  tadabburTarget,
  type VersePos,
} from "../../src/components/Home/homeModel";
import { space, useTheme } from "../../src/theme";
import { ArabicText, Button, Screen, Text } from "../../src/ui";

// Web's hero Arabic is 2.4rem against .arabic's 1.9rem, times the reader size.
const HERO_ARABIC = 2.4 / 1.9;

interface Local {
  hour: number;
  streak: number;
  lastRead: VersePos | null;
  doneToday: boolean;
  deeper: VersePos | null;
  scale: number;
}

// Nothing in core is reactive: read it all again whenever Home regains focus
// (back from the check-in, the reader, a tadabbur, or a sync).
function readLocal(): Local {
  return {
    hour: new Date().getHours(),
    streak: currentStreak(),
    lastRead: getLastRead(),
    doneToday: checkedInToday(),
    deeper: latestSurahTadabbur(),
    scale: scaleFor(getSizeKey()),
  };
}

export default function Home() {
  const { colors } = useTheme();
  const [local, setLocal] = useState<Local>(readLocal);
  const [verseKey, setVerseKey] = useState<string | null>(null);
  const [hero, setHero] = useState<Ayah | null>(null);
  const [heroError, setHeroError] = useState(false);
  const [surahNames, setSurahNames] = useState<Map<number, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      setLocal(readLocal());
      // The day can turn while the app sits in the background.
      void todayVerseKey().then(setVerseKey);
    }, []),
  );

  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => alive && setSurahNames(new Map(list.map((s) => [s.number, s.name]))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!verseKey) return;
    let alive = true;
    setHeroError(false);
    loadAyahsByKeys([verseKey])
      .then((a) => {
        if (!alive) return;
        setHero(a[0] ?? null);
        if (!a[0]) setHeroError(true);
      })
      .catch(() => alive && setHeroError(true));
    return () => {
      alive = false;
    };
  }, [verseKey]);

  const { hour, streak, lastRead, doneToday, deeper, scale } = local;
  const returning = streakLine(streak);
  const tadabbur = tadabburTarget(deeper);
  const tadabburHref = {
    pathname: "/tadabbur/[surah]",
    params: { surah: String(tadabbur.surah), v: String(tadabbur.ayah) },
  } as const;
  const surahName = hero ? surahNames.get(hero.surah) : undefined;

  return (
    <Screen>
      <View style={{ marginTop: space.sm }}>
        <Text variant="eyebrow">{greeting(hour)}</Text>
        {returning ? (
          <Text variant="soft" style={{ fontSize: 15.3, marginTop: 6 }}>
            {returning}
          </Text>
        ) : null}
      </View>

      <View accessibilityLabel="A verse to begin with" style={{ marginTop: 10, marginBottom: 18 }}>
        {hero ? (
          <View>
            <ArabicText scale={HERO_ARABIC * scale}>{hero.arabic}</ArabicText>
            <Text
              variant="translation"
              style={{ fontSize: 20.4, lineHeight: 32.6, marginTop: 14, color: colors.ink }}
            >
              {hero.translation}
            </Text>
            <Text variant="eyebrow" style={{ marginTop: 12 }}>
              {surahName ? `${surahName} · ` : ""}
              {hero.surah}:{hero.ayah}
            </Text>
          </View>
        ) : heroError ? (
          <Text variant="muted">
            Today’s verse is still being gathered. Come back in a little while and it will be
            waiting for you.
          </Text>
        ) : (
          <Text variant="muted">Opening today’s verse…</Text>
        )}

        <View style={{ marginTop: 24, alignItems: "flex-start", gap: 12 }}>
          {doneToday ? (
            <>
              <Text variant="soft">Today’s reflection is saved.</Text>
              <Link href={tadabburHref} asChild>
                <Button kind="secondary" title={deeperLabel(deeper, surahNames)} />
              </Link>
            </>
          ) : (
            <Link href="/checkin" asChild>
              <Button title="Reflect on today’s verse" />
            </Link>
          )}
        </View>
      </View>

      <View accessibilityLabel="Sections" style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
        <HomeEntry
          title="Tadabbur"
          desc="Ponder the Qur’an, surah by surah."
          href={tadabburHref}
        />
        <HomeEntry
          title="Read"
          desc={readDesc(lastRead)}
          href={
            lastRead
              ? {
                  pathname: "/read/[surah]",
                  params: { surah: String(lastRead.surah), v: String(lastRead.ayah) },
                }
              : "/read"
          }
        />
        <HomeEntry title="Dhikr & breath" desc="Remembrance, paced to your breath." />
      </View>

      {/* Required attribution — the translation is CC BY-NC-ND. */}
      <Text variant="muted" style={{ fontSize: 13.6, lineHeight: 20, marginTop: 30 }}>
        English translation by{" "}
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL("https://www.clearquran.com")}
          style={{ color: colors.indigo, fontSize: 13.6, lineHeight: 20 }}
        >
          Talal Itani (ClearQuran)
        </Text>
      </Text>
    </Screen>
  );
}
