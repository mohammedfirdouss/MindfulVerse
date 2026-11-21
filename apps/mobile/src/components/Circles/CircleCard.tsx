// One circle, shown once whether this device joined it, the person started
// it, or both (web: CircleCard in pages/Circles.tsx): what it's reading, who's
// in it, questions for when they meet, how to share it, and what can change.
import {
  currentPassage,
  DISCUSSION_QUESTIONS,
  nextPassage,
} from "@mindfulverse/core/circlePortion";
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  deleteCircle,
  fetchCircleHistory,
  joinCircle,
  leaveCircle,
  updateCircle,
} from "@mindfulverse/core/circles";
import type { Circle, CircleHistoryEntry } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Share, View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { FormError } from "../Account/parts";
import { CircleForm } from "./CircleForm";
import {
  circleSummary,
  deleteLine,
  FULL_NOTE,
  inviteMessage,
  inviteUrl,
  passageOptionLabel,
  qrCaption,
  qrLabel,
  readTogetherLine,
} from "./circleModel";
import type { CircleEntry } from "./circleModel";
import { CircleQr } from "./CircleQr";
import { useCircleCountLine } from "./useCircleCount";

type Mode = "view" | "edit" | "confirm-delete";

const SMALL = { fontSize: 15.5, lineHeight: 22 } as const;
const ROW = { flexDirection: "row", flexWrap: "wrap", gap: space.sm } as const;
const QUIET_ROW = { ...ROW, columnGap: 20, rowGap: 0 } as const;
const SHARE_FAILED = "Couldn’t open the share sheet.";

async function shareCircle(
  circle: Circle,
  surahs: Map<number, SurahMeta>
): Promise<boolean> {
  try {
    await Share.share({ message: inviteMessage(circle, surahs) });
    return true;
  } catch {
    return false;
  }
}

/** A light, unboxed text action (web: .circle-quiet); `danger` is red, and
 *  a `toggle` (the questions) is bold with no underline. */
function QuietAction({
  title,
  danger = false,
  expanded,
  onPress,
}: {
  title: string;
  danger?: boolean;
  expanded?: boolean;
  onPress: () => void;
}) {
  const toggle = expanded !== undefined;
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={toggle ? { expanded } : undefined}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        justifyContent: "center",
        minHeight: 44,
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: 0,
      })}
    >
      <Text
        style={{
          ...SMALL,
          color: danger ? colors.kola : colors.indigo,
          fontFamily: toggle ? fonts.readSemiBold : fonts.read,
          textDecorationLine: toggle ? "none" : "underline",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function CircleCard({
  entry,
  surahs,
  surahList,
  passages,
  showOnHomeLabel,
  initialQr,
  onSaved,
  onDeleted,
}: {
  entry: CircleEntry;
  surahs: Map<number, SurahMeta>;
  surahList: SurahMeta[];
  passages: Map<number, Passage[]>;
  showOnHomeLabel: boolean;
  initialQr: boolean;
  onSaved: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const { circle, owned, joined, onHome } = entry;
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(initialQr);
  const [discuss, setDiscuss] = useState(false);
  const [history, setHistory] = useState<{
    code: string;
    entries: CircleHistoryEntry[];
  }>();
  const surahPassages = passages.get(circle.surah) ?? [];
  const passage = currentPassage(surahPassages, circle);
  const next = owned
    ? nextPassage(surahPassages, circle, surahs.get(circle.surah)?.ayahCount)
    : null;
  const countLine = useCircleCountLine(circle);
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

  async function moveOn(p: Passage) {
    setMoving(true);
    setError(null);
    const result = await updateCircle(circle.code, {
      verse: p.from,
      verseEnd: p.to === p.from ? null : p.to,
    });
    setMoving(false);
    if (result.ok) {
      onSaved(result.value);
      return;
    }
    setError(result.error.message);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteCircle(circle.code);
    setBusy(false);
    if (result.ok) {
      onDeleted(circle.code);
      return;
    }
    setError(result.error.message);
  }

  async function share() {
    const ok = await shareCircle(circle, surahs);
    setError(ok ? null : SHARE_FAILED);
  }

  if (mode === "edit") {
    return (
      <Card>
        <Text variant="h2">{`Edit ${circle.name}`}</Text>
        <CircleForm
          surahs={surahList}
          passages={passages}
          initial={circle}
          submitTitle="Save changes"
          onCancel={() => setMode("view")}
          onSubmit={async (draft) => {
            const result = await updateCircle(circle.code, draft);
            if (result.ok) {
              onSaved(result.value);
              setMode("view");
            }
            return result;
          }}
        />
      </Card>
    );
  }

  return (
    <Card accessibilityLabel={circle.name}>
      <View style={{ gap: 2 }}>
        {onHome && showOnHomeLabel ? (
          <Text variant="eyebrow">On Home</Text>
        ) : null}
        <Text style={{ fontFamily: fonts.readSemiBold }}>{circle.name}</Text>
        <Text variant="soft" style={SMALL}>
          {circleSummary(circle, surahs)}
        </Text>
        {passage ? (
          <Text
            variant="soft"
            style={{ ...SMALL, fontFamily: fonts.textItalic }}
          >
            {passage.theme}
          </Text>
        ) : null}
      </View>
      {countLine || together ? (
        <View style={{ gap: 2 }}>
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
        </View>
      ) : null}

      {next ? (
        <View style={{ alignItems: "flex-start", gap: space.xs }}>
          <Button
            title="Next week’s verses"
            busy={moving}
            onPress={() => void moveOn(next)}
          />
          <Text variant="soft" style={SMALL}>
            {passageOptionLabel({ ...next, theme: "" })}
          </Text>
        </View>
      ) : null}

      <View style={{ alignItems: "flex-start", gap: space.xs }}>
        <QuietAction
          title="Questions for when you meet"
          expanded={discuss}
          onPress={() => setDiscuss((v) => !v)}
        />
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
                      : {
                          surah: String(circle.surah),
                          v: String(circle.verse),
                        },
                  pathname: "/tadabbur/[surah]",
                })
              }
            />
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <View style={ROW}>
          <Button
            kind="secondary"
            title="Share link"
            onPress={() => void share()}
          />
          <Button
            kind="secondary"
            title="QR code"
            accessibilityState={{ expanded: qrOpen }}
            onPress={() => setQrOpen((v) => !v)}
          />
        </View>
        {qrOpen ? (
          <View style={{ alignItems: "flex-start", gap: space.sm }}>
            <CircleQr
              url={inviteUrl(circle.code)}
              label={qrLabel(circle.name)}
            />
            <Text variant="soft" style={SMALL}>
              {qrCaption(circle.name)}
            </Text>
          </View>
        ) : null}
      </View>

      {mode === "confirm-delete" ? (
        <View style={{ gap: space.sm }}>
          <Text variant="soft" style={SMALL}>
            {deleteLine(circle.name)}
          </Text>
          <View style={ROW}>
            <Button
              title="Delete"
              busy={busy}
              onPress={() => void remove()}
              style={{
                backgroundColor: colors.kola,
                borderColor: colors.kola,
              }}
            />
            <Button
              kind="ghost"
              title="Keep it"
              disabled={busy}
              onPress={() => setMode("view")}
            />
          </View>
        </View>
      ) : (
        <View style={QUIET_ROW}>
          {onHome ? null : (
            <QuietAction
              title="Show on Home"
              onPress={() => setError(joinCircle(circle) ? null : FULL_NOTE)}
            />
          )}
          {owned ? (
            <QuietAction title="Edit" onPress={() => setMode("edit")} />
          ) : null}
          {joined && !owned ? (
            <QuietAction
              title="Leave"
              onPress={() => leaveCircle(circle.code)}
            />
          ) : null}
          {owned ? (
            <QuietAction
              title="Delete"
              danger
              onPress={() => setMode("confirm-delete")}
            />
          ) : null}
        </View>
      )}
      <FormError message={error} />
    </Card>
  );
}
