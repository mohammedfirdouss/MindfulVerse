// Home (web: apps/web/src/pages/Home.tsx): greeting, streak, the verse of the
// day, the check-in / go-deeper action, and the places to go with more time.
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { loadAyahsByKeys, loadSurahs } from "@mindfulverse/core/data";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { checkedInToday } from "@mindfulverse/core/journal";
import { currentStreak, getLastRead, latestSurahTadabbur } from "@mindfulverse/core/progress";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import type { Ayah } from "@mindfulverse/core/types";
import { HomeEntry, HomeEntryDivider } from "../../src/components/Home/HomeEntry";
import {
  deeperLabel,
  greeting,
  readDesc,
  streakLine,
  tadabburTarget,
  type VersePos,
} from "../../src/components/Home/homeModel";
import Svg, { Path } from "react-native-svg";
import { fonts, space, useTheme } from "../../src/theme";
import { AdireCloth, ArabicText, Button, DyeRule, Screen, Text, useOnCloth } from "../../src/ui";
import { FadeRise, useReducedMotion } from "../../src/ui/FadeRise";
import { DhikrIcon, ReadIcon, TadabburIcon } from "../../src/ui/icons";

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
  const cloth = useOnCloth();
  const reduce = useReducedMotion();
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
      <View style={{ marginTop: space.xs, gap: 4 }}>
        <Text variant="muted" style={{ fontSize: 14.5, lineHeight: 20 }}>
          {todayLabel()}
        </Text>
        <Text variant="h2">{greeting(hour)}</Text>
        {returning ? <StreakBeads streak={streak} label={returning} /> : null}
      </View>

      <FadeRise reduce={reduce} style={{ marginTop: 6 }}>
        <AdireCloth style={{ padding: space.lg, paddingTop: 20 }}>
          <View accessibilityLabel="A verse to begin with">
            <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 13, lineHeight: 18, color: cloth.accent, letterSpacing: 1.2 }}>
              TODAY’S VERSE
            </Text>
            {hero ? (
              <View>
                <ArabicText scale={HERO_ARABIC * scale} style={{ color: cloth.strong, marginTop: 6 }}>
                  {hero.arabic}
                </ArabicText>
                <Text
                  variant="translation"
                  style={{ fontSize: 20.4, lineHeight: 31, marginTop: 6, color: cloth.strong }}
                >
                  {hero.translation}
                </Text>
                <Text style={{ marginTop: 10, fontSize: 14.5, lineHeight: 20, color: cloth.soft }}>
                  {surahName ? `${surahName} · ` : ""}
                  {hero.surah}:{hero.ayah}
                </Text>
              </View>
            ) : (
              <Text style={{ color: cloth.soft, marginTop: 10 }}>
                {heroError
                  ? "Today’s verse is still being gathered. Come back in a little while and it will be waiting for you."
                  : "Opening today’s verse…"}
              </Text>
            )}

            <View style={{ marginTop: 22, alignItems: "flex-start", gap: 10 }}>
              {doneToday ? (
                <>
                  <Text style={{ color: cloth.soft, fontSize: 15.5, lineHeight: 22 }}>Today’s reflection is saved.</Text>
                  <Button kind="cloth" title={deeperLabel(deeper, surahNames)} onPress={() => router.push(tadabburHref)} />
                </>
              ) : (
                <Button kind="cloth" title="Reflect on today’s verse" onPress={() => router.push("/checkin")} />
              )}
            </View>
          </View>
        </AdireCloth>
      </FadeRise>

      <View accessibilityLabel="Sections" style={{ marginTop: space.sm }}>
        <HomeEntry Icon={TadabburIcon} title="Tadabbur" desc="Ponder the Qur’an, surah by surah." href={tadabburHref} />
        <HomeEntryDivider />
        <HomeEntry
          Icon={ReadIconFlat}
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
        <HomeEntryDivider />
        <HomeEntry Icon={DhikrIcon} title="Dhikr & breath" desc="Remembrance, paced to your breath." />
      </View>

      <DyeRule style={{ marginTop: space.lg }} />

      {/* Required attribution — the translation is CC BY-NC-ND. */}
      <Text variant="muted" style={{ fontSize: 13.6, lineHeight: 20, textAlign: "center" }}>
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

/** "Wednesday, 7 October" in the phone's language. */
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return new Date().toDateString();
  }
}

/** The returning streak as a string of beads: one per day, up to a week. */
function StreakBeads({ streak, label }: { streak: number; label: string }) {
  const { colors } = useTheme();
  const filled = Math.min(streak, 7);
  return (
    <View accessible accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Svg key={i} width={9} height={9}>
            <Path d="M4.5 0 L9 4.5 L4.5 9 L0 4.5Z" fill={i < filled ? colors.kola : colors.lineStrong} />
          </Svg>
        ))}
      </View>
      <Text variant="soft" style={{ fontSize: 14.5, lineHeight: 20 }}>
        {label}
      </Text>
    </View>
  );
}

function ReadIconFlat({ color, size }: { color: string; size?: number }) {
  return <ReadIcon color={color} focused={false} size={size} />;
}
