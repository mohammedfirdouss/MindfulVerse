// What a circle does together (web: CircleTogether in pages/Circles.tsx):
// this week's passage, how many are in it, what they've read, questions for
// when they meet, and a QR code to join.
import {
  currentPassage,
  DISCUSSION_QUESTIONS,
} from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import { fetchCircleHistory } from "@mindfulverse/core/circles";
import type { Circle, CircleHistoryEntry } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { fonts, space } from "../../theme";
import { Button, Text } from "../../ui";
import { inviteUrl, qrCaption, qrLabel, readTogetherLine } from "./circleModel";
import { CircleQr } from "./CircleQr";
import { useCircleCountLine } from "./useCircleCount";

const SMALL = { fontSize: 15.5, lineHeight: 22 } as const;

export function CircleTogether({
  circle,
  surahs,
  passages,
  showCount,
}: {
  circle: Circle;
  surahs: Map<number, SurahMeta>;
  passages: Map<number, Passage[]>;
  showCount: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [discuss, setDiscuss] = useState(false);
  const [history, setHistory] = useState<{
    code: string;
    entries: CircleHistoryEntry[];
  }>();
  const passage = currentPassage(passages.get(circle.surah) ?? [], circle);
  const countLine = useCircleCountLine(showCount ? circle : null);
  const together =
    history?.code === circle.code
      ? readTogetherLine(history.entries, circle.surah, surahs)
      : null;

  useEffect(() => {
    let alive = true;
    void fetchCircleHistory(circle.code).then((entries) => {
      if (alive) {
        setHistory({ code: circle.code, entries });
      }
    });
    return () => {
      alive = false;
    };
  }, [circle.code, circle.surah]);

  return (
    <View style={{ gap: space.sm }}>
      {passage ? (
        <Text variant="soft" style={{ ...SMALL, fontFamily: fonts.textItalic }}>
          {passage.theme}
        </Text>
      ) : null}
      {countLine ? (
        <Text variant="soft" style={SMALL}>
          {countLine}
        </Text>
      ) : null}
      {together ? (
        <Text variant="soft" style={SMALL}>
          {together}
        </Text>
      ) : null}

      <View style={{ alignItems: "flex-start" }}>
        <Button
          kind="ghost"
          title="Questions for when you meet"
          accessibilityState={{ expanded: discuss }}
          onPress={() => setDiscuss((v) => !v)}
        />
      </View>
      {discuss ? (
        <View style={{ alignItems: "flex-start", gap: space.xs }}>
          {DISCUSSION_QUESTIONS.map((q, i) => (
            <Text key={q} style={SMALL}>
              {`${i + 1}. ${q}`}
            </Text>
          ))}
          <Button
            kind="ghost"
            title="Read and reflect on your own first"
            accessibilityRole="link"
            onPress={() =>
              router.push({
                params:
                  circle.verse === null
                    ? { surah: String(circle.surah) }
                    : { surah: String(circle.surah), v: String(circle.verse) },
                pathname: "/tadabbur/[surah]",
              })
            }
          />
        </View>
      ) : null}

      <View style={{ alignItems: "flex-start" }}>
        <Button
          kind="ghost"
          title={showQr ? "Hide QR code" : "Show QR code"}
          accessibilityState={{ expanded: showQr }}
          onPress={() => setShowQr((v) => !v)}
        />
      </View>
      {showQr ? <QrFigure circle={circle} caption /> : null}
    </View>
  );
}

/** The invite QR, with or without its "Scan with a phone camera" caption. */
export function QrFigure({
  circle,
  caption = false,
}: {
  circle: Pick<Circle, "code" | "name">;
  caption?: boolean;
}) {
  return (
    <View style={{ alignItems: "flex-start", gap: space.sm }}>
      <CircleQr url={inviteUrl(circle.code)} label={qrLabel(circle.name)} />
      {caption ? (
        <Text variant="soft" style={SMALL}>
          {qrCaption(circle.name)}
        </Text>
      ) : null}
    </View>
  );
}
