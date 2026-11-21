// /circles (web: pages/Circles.tsx): every circle once, the ones this device
// joined first (the first is the one Home leads with), then the ones the
// person started; and below them a way to start one. Starting needs an
// account so it stays yours to change; joining never does.
import { surahPassages } from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  circleError,
  circlesFull,
  createCircle,
  getJoinedCircles,
  listMyCircles,
  onJoinedCircleChange,
  refreshJoinedCircles,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import { loadSurahs, loadThemes } from "@mindfulverse/core/data";
import { useAccount } from "@mindfulverse/core/sync/auth";
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { FormError } from "../../src/components/Account/parts";
import { CircleCard } from "../../src/components/Circles/CircleCard";
import { CircleForm } from "../../src/components/Circles/CircleForm";
import {
  circleEntries,
  CREATED_LINE,
  FULL_NOTE,
  PRIVACY_LINE,
  SIGNED_OUT_LINE,
  startView,
} from "../../src/components/Circles/circleModel";
import { space, useTheme } from "../../src/theme";
import { Button, Card, Screen, Text } from "../../src/ui";

const SURAH_COUNT = 114;

type MineState =
  | { status: "loading" }
  | { status: "ready"; circles: Circle[] }
  | { status: "error"; message: string };

export default function Circles() {
  const { colors } = useTheme();
  const { user, loading: accountLoading } = useAccount();
  const [surahList, setSurahList] = useState<SurahMeta[]>([]);
  const surahs = useMemo(
    () => new Map(surahList.map((s) => [s.number, s])),
    [surahList]
  );
  const [passages, setPassages] = useState<Map<number, Passage[]>>(
    () => new Map()
  );
  const [joined, setJoined] = useState<Circle[]>(getJoinedCircles);
  const [mine, setMine] = useState<MineState>({ status: "loading" });
  const [created, setCreated] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    const off = onJoinedCircleChange(() => setJoined(getJoinedCircles()));
    void refreshJoinedCircles().then(setJoined);
    return off;
  }, []);

  useEffect(() => {
    let alive = true;
    loadSurahs()
      .then((list) => alive && setSurahList(list))
      .catch(() => {});
    loadThemes()
      .then((themes) => {
        if (!alive) {
          return;
        }
        const bySurah = new Map<number, Passage[]>();
        for (let n = 1; n <= SURAH_COUNT; n += 1) {
          bySurah.set(n, surahPassages(themes, n));
        }
        setPassages(bySurah);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadMine = useCallback(async () => {
    setMine({ status: "loading" });
    const result = await listMyCircles();
    setMine(
      result.ok
        ? { circles: result.value, status: "ready" }
        : { message: result.error.message, status: "error" }
    );
  }, []);

  useEffect(() => {
    if (userId) {
      void loadMine();
    }
  }, [userId, loadMine]);

  const replaceMine = (next: (circles: Circle[]) => Circle[]) =>
    setMine((m) =>
      m.status === "ready" ? { circles: next(m.circles), status: "ready" } : m
    );

  const owned = userId && mine.status === "ready" ? mine.circles : [];
  const entries = circleEntries(joined, owned);
  const start = startView({
    accountLoading,
    count: entries.length,
    formOpen,
    ownedLoaded: mine.status !== "loading",
    signedIn: userId !== null,
  });
  const ownedLoading = userId !== null && mine.status === "loading";

  return (
    <Screen edges="bottom">
      <Text variant="soft">{PRIVACY_LINE}</Text>

      {created ? (
        <View accessibilityLiveRegion="polite">
          <Text>{CREATED_LINE}</Text>
        </View>
      ) : null}

      {userId && mine.status === "error" ? (
        <View style={{ alignItems: "flex-start", gap: space.sm }}>
          <FormError message={mine.message} />
          <Button
            kind="secondary"
            title="Try again"
            onPress={() => void loadMine()}
          />
        </View>
      ) : null}

      {entries.length > 0 ? (
        <View style={{ gap: space.md }}>
          {entries.map((entry) => (
            <CircleCard
              key={entry.circle.code}
              entry={entry}
              surahs={surahs}
              surahList={surahList}
              passages={passages}
              showOnHomeLabel={entries.length > 1}
              initialQr={entry.circle.code === created}
              onSaved={(c) =>
                replaceMine((cs) => cs.map((x) => (x.code === c.code ? c : x)))
              }
              onDeleted={(code) =>
                replaceMine((cs) => cs.filter((x) => x.code !== code))
              }
            />
          ))}
        </View>
      ) : null}

      {accountLoading || ownedLoading ? (
        <ActivityIndicator color={colors.indigo} />
      ) : null}

      {start === "signed-out" ? (
        <View style={{ alignItems: "flex-start", gap: space.sm }}>
          <Text variant="soft">{SIGNED_OUT_LINE}</Text>
          <Button title="Sign in" onPress={() => router.navigate("/account")} />
        </View>
      ) : null}

      {start === "form" ? (
        <Card>
          <Text variant="h2">Start a circle</Text>
          <CircleForm
            key={formKey}
            surahs={surahList}
            passages={passages}
            submitTitle="Start circle"
            onCancel={entries.length > 0 ? () => setFormOpen(false) : undefined}
            onSubmit={async (draft) => {
              if (circlesFull()) {
                return {
                  error: { ...circleError("invalid"), message: FULL_NOTE },
                  ok: false,
                };
              }
              const result = await createCircle(draft);
              if (result.ok) {
                replaceMine((cs) => [result.value, ...cs]);
                setCreated(result.value.code);
                setFormOpen(false);
                setFormKey((k) => k + 1);
              }
              return result;
            }}
          />
        </Card>
      ) : null}

      {start === "button" ? (
        <View style={{ alignItems: "flex-start" }}>
          <Button
            kind="secondary"
            title="Start a circle"
            onPress={() => setFormOpen(true)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
