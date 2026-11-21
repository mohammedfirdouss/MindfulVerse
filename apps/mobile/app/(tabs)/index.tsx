import {
  getJoinedCircle,
  getJoinedCircles,
  onJoinedCircleChange,
  refreshJoinedCircle,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { getCircleSurah } from "@mindfulverse/core/circleSurah";
import { todayVerseKey } from "@mindfulverse/core/dailyVerse";
import { loadAyahsByKeys, loadSurahs } from "@mindfulverse/core/data";
import { checkedInToday, getEntries } from "@mindfulverse/core/journal";
import {
  currentStreak,
  getLastRead,
  latestSurahTadabbur,
} from "@mindfulverse/core/progress";
import { getSizeKey, scaleFor } from "@mindfulverse/core/readingPrefs";
import { useAccount } from "@mindfulverse/core/sync/auth";
import { onSyncStatus } from "@mindfulverse/core/sync/engine";
import type { Ayah, SurahMeta } from "@mindfulverse/core/types";
import {
  WORD_MEANINGS_BOOK,
  WORD_MEANINGS_BOOK_URL,
  WORD_MEANINGS_CREDIT,
} from "@mindfulverse/core/wordByWord";
// Home (web: apps/web/src/pages/Home.tsx): greeting, streak, the surah journal
// first, a due follow-up, the verse of the day, a few themes, then the places
// to go with more time.
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { CirclesIcon } from "../../src/components/Circles/CirclesIcon";
import { createThrottle } from "../../src/components/Circles/throttle";
import { useCircleCountLine } from "../../src/components/Circles/useCircleCount";
import { FollowUpCard } from "../../src/components/Home/FollowUpCard";
import {
  HomeEntry,
  HomeEntryDivider,
} from "../../src/components/Home/HomeEntry";
import {
  greeting,
  readDesc,
  streakLine,
} from "../../src/components/Home/homeModel";
import type { VersePos } from "../../src/components/Home/homeModel";
import { chooseLead } from "../../src/components/Home/leadModel";
import { SurahLead } from "../../src/components/Home/SurahLead";
import { ThemeSection } from "../../src/components/Home/ThemeSection";
import { rhythmView } from "../../src/components/Home/weekModel";
import type { RhythmView } from "../../src/components/Home/weekModel";
import { WeekRhythm } from "../../src/components/Home/WeekRhythm";
import { space, useTheme } from "../../src/theme";
import { ArabicText, Button, Card, DyeRule, Screen, Text } from "../../src/ui";
import { useReducedMotion } from "../../src/ui/FadeRise";
import { ReadIcon, TadabburIcon } from "../../src/ui/icons";

const circleRefresh = createThrottle();

interface Local {
  hour: number;
  streak: number;
  lastRead: VersePos | null;
  doneToday: boolean;
  deeper: VersePos | null;
  circleSurah: number | null;
  rhythm: RhythmView | null;
  scale: number;
}

// Nothing in core is reactive: read it all again whenever Home regains focus
// (back from the check-in, the reader, a tadabbur, a sync, or a circle link
// opened while Home sat underneath).
function readLocal(): Local {
  return {
    circleSurah: getCircleSurah()?.surah ?? null,
    deeper: latestSurahTadabbur(),
    doneToday: checkedInToday(),
    hour: new Date().getHours(),
    lastRead: getLastRead(),
    rhythm: rhythmView(getEntries(), new Date()),
    scale: scaleFor(getSizeKey()),
    streak: currentStreak(),
  };
}

export default function Home() {
  const { colors } = useTheme();
  const { user, loading: accountLoading } = useAccount();
  const accountId = user?.id ?? null;
  const reduce = useReducedMotion();
  const [local, setLocal] = useState<Local>(readLocal);
  const [joined, setJoined] = useState<Circle | null>(getJoinedCircle);
  const [joinedCount, setJoinedCount] = useState(
    () => getJoinedCircles().length
  );
  const [verseKey, setVerseKey] = useState<string | null>(null);
  const [hero, setHero] = useState<Ayah | null>(null);
  const [heroError, setHeroError] = useState(false);
  const [surahs, setSurahs] = useState<Map<number, SurahMeta>>(new Map());
  const circleCount = useCircleCountLine(joined);
  const surahNames = useMemo(
    () => new Map([...surahs].map(([n, s]) => [n, s.name])),
    [surahs]
  );

  // A sync brings in days from other devices: re-read the streak and week.
  useEffect(
    () =>
      onSyncStatus((s) => {
        if (s === "synced") {
          setLocal(readLocal());
        }
      }),
    []
  );

  useEffect(
    () =>
      onJoinedCircleChange((primary) => {
        setJoined(primary);
        setJoinedCount(getJoinedCircles().length);
      }),
    []
  );

  useFocusEffect(
    useCallback(() => {
      setLocal(readLocal());
      setJoined(getJoinedCircle());
      setJoinedCount(getJoinedCircles().length);
      // The owner may have moved the circle on to another surah or verse.
      // Asked at most once every two minutes per circle.
      const joinedCode = getJoinedCircle()?.code;
      if (joinedCode && circleRefresh.due(joinedCode, Date.now())) {
        void refreshJoinedCircle();
      }
      // The day can turn while the app sits in the background. Each person
      // has their own verse; wait for the account so it doesn't flip.
      if (!accountLoading) {
        void todayVerseKey(accountId).then(setVerseKey);
      }
    }, [accountId, accountLoading])
  );

  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then(
        (list) => alive && setSurahs(new Map(list.map((s) => [s.number, s])))
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!verseKey) {
      return;
    }
    let alive = true;
    setHeroError(false);
    loadAyahsByKeys([verseKey])
      .then((a) => {
        if (!alive) {
          return;
        }
        setHero(a[0] ?? null);
        if (!a[0]) {
          setHeroError(true);
        }
      })
      .catch(() => alive && setHeroError(true));
    return () => {
      alive = false;
    };
  }, [verseKey]);

  const {
    hour,
    streak,
    lastRead,
    doneToday,
    deeper,
    circleSurah,
    rhythm,
    scale,
  } = local;
  const returning = streakLine(streak);
  const tadabburHref = deeper
    ? ({
        params: { surah: String(deeper.surah), v: String(deeper.ayah) },
        pathname: "/tadabbur/[surah]",
      } as const)
    : "/tadabbur";
  const surahName = hero ? surahNames.get(hero.surah) : undefined;

  return (
    <Screen>
      <View style={{ gap: 4, marginTop: space.xs }}>
        <Text variant="muted" style={{ fontSize: 14.5, lineHeight: 20 }}>
          {todayLabel()}
        </Text>
        <Text variant="h2">{greeting(hour)}</Text>
        {returning ? <StreakBeads streak={streak} label={returning} /> : null}
      </View>

      <SurahLead
        lead={chooseLead(deeper, circleSurah, joined)}
        surahs={surahs}
        surahNames={surahNames}
        joinedCount={joinedCount}
        reduce={reduce}
      />
      {circleCount ? (
        <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
          {circleCount}
        </Text>
      ) : null}

      <FollowUpCard surahNames={surahNames} reduce={reduce} />

      {rhythm ? <WeekRhythm rhythm={rhythm} /> : null}

      <Card accessibilityLabel="Today’s verse" style={{ marginTop: space.sm }}>
        {hero ? (
          <View>
            <ArabicText scale={scale}>{hero.arabic}</ArabicText>
            <Text
              variant="translation"
              style={{ fontSize: 19, lineHeight: 29, marginTop: 6 }}
            >
              {hero.translation}
            </Text>
            <Text
              variant="muted"
              style={{ fontSize: 14.5, lineHeight: 20, marginTop: 10 }}
            >
              {surahName ? `${surahName} ` : ""}
              {hero.surah}:{hero.ayah}
            </Text>
          </View>
        ) : (
          <Text variant="soft">
            {heroError
              ? "Today’s verse isn’t ready yet. Try again shortly."
              : "Opening today’s verse…"}
          </Text>
        )}

        <View style={{ alignItems: "flex-start" }}>
          {doneToday ? (
            <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
              Today’s reflection is saved.
            </Text>
          ) : (
            <Button
              kind="secondary"
              title="Reflect on today’s verse"
              onPress={() => router.push("/checkin")}
            />
          )}
        </View>
      </Card>

      <ThemeSection />

      <View accessibilityLabel="Sections" style={{ marginTop: space.sm }}>
        <HomeEntry
          Icon={TadabburIcon}
          title="Tadabbur"
          desc="Ponder the Qur’an, surah by surah."
          href={tadabburHref}
        />
        <HomeEntryDivider />
        <HomeEntry
          Icon={ReadIconFlat}
          title="Read"
          desc={readDesc(lastRead)}
          href={
            lastRead
              ? {
                  params: {
                    surah: String(lastRead.surah),
                    v: String(lastRead.ayah),
                  },
                  pathname: "/read/[surah]",
                }
              : "/read"
          }
        />
        <HomeEntryDivider />
        <HomeEntry
          Icon={CirclesIcon}
          title="Circles"
          desc="Read a surah together with friends."
          href="/circles"
        />
      </View>

      <DyeRule style={{ marginTop: space.lg }} />

      {/* Required attribution — the translation is CC BY-NC-ND. */}
      <Text
        variant="muted"
        style={{ fontSize: 13.6, lineHeight: 20, textAlign: "center" }}
      >
        English translation by{" "}
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL("https://www.clearquran.com")}
          style={{ color: colors.indigo, fontSize: 13.6, lineHeight: 20 }}
        >
          Talal Itani (ClearQuran)
        </Text>
      </Text>
      {/* The authors' condition for using their word meanings. */}
      <Text
        variant="muted"
        style={{ fontSize: 13.6, lineHeight: 20, textAlign: "center" }}
      >
        {WORD_MEANINGS_CREDIT}
        {" · "}
        <Text
          accessibilityRole="link"
          onPress={() =>
            void Linking.openURL(WORD_MEANINGS_BOOK_URL).catch(() => {})
          }
          style={{ color: colors.indigo, fontSize: 13.6, lineHeight: 20 }}
        >
          {WORD_MEANINGS_BOOK}
        </Text>
      </Text>
    </Screen>
  );
}

/** "Wednesday, 7 October" in the phone's language. */
function todayLabel(): string {
  try {
    return new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      weekday: "long",
    });
  } catch {
    return new Date().toDateString();
  }
}

/** The returning streak as a string of beads: one per day, up to a week. */
function StreakBeads({ streak, label }: { streak: number; label: string }) {
  const { colors } = useTheme();
  const filled = Math.min(streak, 7);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Svg key={i} width={9} height={9}>
            <Path
              d="M4.5 0 L9 4.5 L4.5 9 L0 4.5Z"
              fill={i < filled ? colors.kola : colors.lineStrong}
            />
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
