// One circle the signed-in person started: this week's verses and what the
// circle does together, moving on to next week's passage, its link, Share,
// edit in place, and delete behind an inline confirm.
import type { Passage } from "@mindfulverse/core/circlePortion";
import {
  deleteCircle,
  joinCircle,
  updateCircle,
} from "@mindfulverse/core/circles";
import type { Circle } from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { useState } from "react";
import { Share, View } from "react-native";

import { fonts, space, useTheme } from "../../theme";
import { Button, Card, Text } from "../../ui";
import { FormError } from "../Account/parts";
import { CircleForm } from "./CircleForm";
import {
  circleSummary,
  FULL_NOTE,
  inviteMessage,
  inviteUrl,
  LAST_PASSAGE_NOTE,
  nextStep,
  passageOptionLabel,
} from "./circleModel";
import { CircleTogether } from "./CircleTogether";

type Mode = "view" | "edit" | "confirm-delete";

export async function shareCircle(
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

export function CircleLinkBlock({
  circle,
  surahs,
}: {
  circle: Circle;
  surahs: Map<number, SurahMeta>;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return (
    <View style={{ alignItems: "flex-start", gap: space.sm }}>
      <Text
        selectable
        accessibilityLabel={`Circle link: ${inviteUrl(circle.code)}`}
        style={{
          color: colors.indigo,
          fontFamily: fonts.readMedium,
          fontSize: 15.5,
          lineHeight: 22,
        }}
      >
        {inviteUrl(circle.code)}
      </Text>
      <Button
        kind="secondary"
        title="Share link"
        onPress={() =>
          void shareCircle(circle, surahs).then((ok) => setFailed(!ok))
        }
      />
      {failed ? <FormError message="Couldn’t open the share sheet." /> : null}
    </View>
  );
}

export function OwnedCircle({
  circle,
  surahs,
  surahList,
  passages,
  joinedCodes,
  onChanged,
  onDeleted,
}: {
  circle: Circle;
  surahs: Map<number, SurahMeta>;
  surahList: SurahMeta[];
  passages: Map<number, Passage[]>;
  joinedCodes: string[];
  onChanged: (circle: Circle) => void;
  onDeleted: (code: string) => void;
}) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const onHome = joinedCodes[0] === circle.code;
  const { next, atLast } = nextStep(
    passages.get(circle.surah) ?? [],
    circle,
    surahs.get(circle.surah)?.ayahCount
  );

  async function moveOn(p: Passage) {
    setMoving(true);
    setError(null);
    const result = await updateCircle(circle.code, {
      verse: p.from,
      verseEnd: p.to === p.from ? null : p.to,
    });
    setMoving(false);
    if (result.ok) {
      onChanged(result.value);
      return;
    }
    setError(result.error.message);
  }

  function showOnHome() {
    setError(joinCircle(circle) ? null : FULL_NOTE);
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

  if (mode === "edit") {
    return (
      <Card>
        <CircleForm
          surahs={surahList}
          passages={passages}
          initial={circle}
          submitTitle="Save changes"
          onCancel={() => setMode("view")}
          onSubmit={async (draft) => {
            const result = await updateCircle(circle.code, draft);
            if (result.ok) {
              onChanged(result.value);
              setMode("view");
            }
            return result;
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Text style={{ fontFamily: fonts.readSemiBold }}>{circle.name}</Text>
        <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
          {circleSummary(circle, surahs)}
        </Text>
      </View>
      <CircleTogether
        circle={circle}
        surahs={surahs}
        passages={passages}
        showCount={!joinedCodes.includes(circle.code)}
      />
      {next ? (
        <View style={{ alignItems: "flex-start", gap: space.xs }}>
          <Button
            kind="secondary"
            title="Move to next week’s verses"
            busy={moving}
            onPress={() => void moveOn(next)}
          />
          <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
            {passageOptionLabel(next)}
          </Text>
        </View>
      ) : null}
      {atLast ? (
        <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
          {LAST_PASSAGE_NOTE}
        </Text>
      ) : null}
      <CircleLinkBlock circle={circle} surahs={surahs} />
      {mode === "confirm-delete" ? (
        <View style={{ gap: space.sm }}>
          <Text variant="soft" style={{ fontSize: 15.5, lineHeight: 22 }}>
            Delete this circle? Its link stops working. Members keep their
            reflections.
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          <Button kind="ghost" title="Edit" onPress={() => setMode("edit")} />
          {onHome ? null : (
            <Button kind="ghost" title="Show on Home" onPress={showOnHome} />
          )}
          <Button
            kind="ghost"
            title="Delete"
            onPress={() => setMode("confirm-delete")}
          />
        </View>
      )}
      <FormError message={error} />
    </Card>
  );
}
