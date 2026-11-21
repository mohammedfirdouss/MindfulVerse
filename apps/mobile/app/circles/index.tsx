// /circles: start a circle and share its link or QR code, look after the
// circles you started, and see or leave the circles this device has joined
// (up to three; the first is the one Home leads with). Starting one needs an
// account so it stays yours to change; joining never does.
import { surahPassages } from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  circleError,
  circlesFull,
  createCircle,
  getJoinedCircles,
  joinCircle,
  leaveCircle,
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
import { CircleForm } from "../../src/components/Circles/CircleForm";
import {
  circleSummary,
  createdLine,
  FULL_NOTE,
  joinedHeading,
  PRIVACY_LINE,
  SIGNED_OUT_LINE,
} from "../../src/components/Circles/circleModel";
import {
  CircleTogether,
  QrFigure,
} from "../../src/components/Circles/CircleTogether";
import {
  CircleLinkBlock,
  OwnedCircle,
} from "../../src/components/Circles/OwnedCircle";
import { fonts, space, useTheme } from "../../src/theme";
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
  const [created, setCreated] = useState<Circle | null>(null);
  const [formKey, setFormKey] = useState(0);
  const userId = user?.id ?? null;
  const joinedCodes = joined.map((c) => c.code);

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

  return (
    <Screen edges="bottom">
      <Text variant="soft">{PRIVACY_LINE}</Text>

      {joined.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text variant="h2">{joinedHeading(joined.length)}</Text>
          {joined.map((circle, i) => (
            <JoinedCircle
              key={circle.code}
              circle={circle}
              first={i === 0}
              several={joined.length > 1}
              surahs={surahs}
              passages={passages}
            />
          ))}
        </View>
      ) : null}

      {accountLoading ? <ActivityIndicator color={colors.indigo} /> : null}

      {!accountLoading && !userId ? (
        <Card>
          <Text variant="h2">Start a circle</Text>
          <Text variant="soft">{SIGNED_OUT_LINE}</Text>
          <View style={{ alignItems: "flex-start" }}>
            <Button
              title="Sign in"
              onPress={() => router.navigate("/account")}
            />
          </View>
        </Card>
      ) : null}

      {userId ? (
        <>
          <Card>
            <Text variant="h2">Start a circle</Text>
            {created ? (
              <View style={{ gap: space.md }}>
                <Text style={{ fontFamily: fonts.readSemiBold }}>
                  {createdLine(created.name)}
                </Text>
                <CircleLinkBlock circle={created} surahs={surahs} />
                <QrFigure circle={created} />
                <View style={{ alignItems: "flex-start" }}>
                  <Button
                    kind="ghost"
                    title="Start another circle"
                    onPress={() => {
                      setCreated(null);
                      setFormKey((k) => k + 1);
                    }}
                  />
                </View>
              </View>
            ) : (
              <CircleForm
                key={formKey}
                surahs={surahList}
                passages={passages}
                submitTitle="Start circle"
                onSubmit={async (draft) => {
                  if (circlesFull()) {
                    return {
                      error: { ...circleError("invalid"), message: FULL_NOTE },
                      ok: false,
                    };
                  }
                  const result = await createCircle(draft);
                  if (result.ok) {
                    setCreated(result.value);
                    replaceMine((cs) => [result.value, ...cs]);
                  }
                  return result;
                }}
              />
            )}
          </Card>

          <View style={{ gap: space.md }}>
            {showMineHeading(mine, created) ? (
              <Text variant="h2">Circles you started</Text>
            ) : null}
            <MineList
              mine={mine}
              surahs={surahs}
              surahList={surahList}
              passages={passages}
              joinedCodes={joinedCodes}
              createdCode={created?.code ?? null}
              onRetry={() => void loadMine()}
              onChanged={(c) =>
                replaceMine((cs) => [c, ...cs.filter((x) => x.code !== c.code)])
              }
              onDeleted={(code) => {
                replaceMine((cs) => cs.filter((x) => x.code !== code));
                if (created?.code === code) {
                  setCreated(null);
                }
              }}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/** Hidden while the only circle is the one just started, shown above. */
function showMineHeading(mine: MineState, created: Circle | null): boolean {
  return !(
    created &&
    mine.status === "ready" &&
    mine.circles.every((c) => c.code === created.code)
  );
}

function MineList({
  mine,
  surahs,
  surahList,
  passages,
  joinedCodes,
  createdCode,
  onRetry,
  onChanged,
  onDeleted,
}: {
  mine: MineState;
  surahs: Map<number, SurahMeta>;
  surahList: SurahMeta[];
  passages: Map<number, Passage[]>;
  joinedCodes: string[];
  createdCode: string | null;
  onRetry: () => void;
  onChanged: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const { colors } = useTheme();
  if (mine.status === "loading") {
    return <ActivityIndicator color={colors.indigo} />;
  }
  if (mine.status === "error") {
    return (
      <View style={{ alignItems: "flex-start", gap: space.sm }}>
        <FormError message={mine.message} />
        <Button kind="secondary" title="Try again" onPress={onRetry} />
      </View>
    );
  }
  const listed = mine.circles.filter((c) => c.code !== createdCode);
  if (listed.length === 0) {
    if (createdCode) {
      return null;
    }
    return <Text variant="muted">None yet.</Text>;
  }
  return (
    <>
      {listed.map((c) => (
        <OwnedCircle
          key={c.code}
          circle={c}
          surahs={surahs}
          surahList={surahList}
          passages={passages}
          joinedCodes={joinedCodes}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
      ))}
    </>
  );
}

/** One circle this device is in: what it reads, what it does together, and
 *  Home or leave. */
function JoinedCircle({
  circle,
  first,
  several,
  surahs,
  passages,
}: {
  circle: Circle;
  first: boolean;
  several: boolean;
  surahs: Map<number, SurahMeta>;
  passages: Map<number, Passage[]>;
}) {
  return (
    <Card accessibilityLabel={circle.name}>
      <View style={{ gap: 2 }}>
        {first && several ? <Text variant="eyebrow">On Home</Text> : null}
        <Text style={{ fontFamily: fonts.readSemiBold }}>{circle.name}</Text>
        <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
          {circleSummary(circle, surahs)}
        </Text>
      </View>
      <CircleTogether
        circle={circle}
        surahs={surahs}
        passages={passages}
        showCount
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {first ? (
          <Button
            title="Open on Home"
            kind="secondary"
            onPress={() => router.navigate("/")}
          />
        ) : (
          <Button
            title="Show on Home"
            kind="secondary"
            onPress={() => joinCircle(circle)}
          />
        )}
        <Button
          kind="ghost"
          title="Leave circle"
          onPress={() => leaveCircle(circle.code)}
        />
      </View>
    </Card>
  );
}
