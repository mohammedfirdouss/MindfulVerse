// Start or change a circle: name, surah, and this week's verses (the whole
// surah or one of its passages). Used for both, so the owner edits with the
// same fields they created with.
import type { Passage } from "@mindfulverse/core/circlePortion";
import { CIRCLE_NAME_MAX, normalizeName } from "@mindfulverse/core/circles";
import type {
  CircleDraft,
  CircleResult,
  Circle,
} from "@mindfulverse/core/circles";
import type { SurahMeta } from "@mindfulverse/core/types";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { fonts, radius, space, useTheme } from "../../theme";
import { Button, Text } from "../../ui";
import { Field, FormError } from "../Account/parts";
import {
  checkPortion,
  portionChoiceLabel,
  portionChoices,
  portionValue,
} from "./circleModel";
import { PortionPicker } from "./PortionPicker";
import { SurahPicker } from "./SurahPicker";

type Picking = "surah" | "portion" | null;

export function CircleForm({
  surahs,
  passages,
  initial,
  submitTitle,
  onSubmit,
  onCancel,
}: {
  surahs: SurahMeta[];
  passages: Map<number, Passage[]>;
  initial?: Pick<Circle, "name" | "surah" | "verse" | "verseEnd">;
  submitTitle: string;
  onSubmit: (draft: CircleDraft) => Promise<CircleResult<Circle>>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [surah, setSurah] = useState<number | null>(initial?.surah ?? null);
  const [portion, setPortion] = useState(initial ? portionValue(initial) : "");
  const [picking, setPicking] = useState<Picking>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = surahs.find((s) => s.number === surah);
  const surahPassages = surah === null ? [] : (passages.get(surah) ?? []);
  let surahText = "Choose a surah";
  if (meta) {
    surahText = `${meta.name} · ${meta.ayahCount} verses`;
  } else if (surahs.length === 0) {
    surahText = "Gathering the surahs…";
  }
  const portionText = portionChoiceLabel(surahPassages, portion);

  async function submit() {
    setError(null);
    const cleanName = normalizeName(name);
    if (cleanName === null) {
      setError("Give the circle a name.");
      return;
    }
    if (surah === null) {
      setError("Choose a surah.");
      return;
    }
    const checked = checkPortion(portion, meta?.ayahCount);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setBusy(true);
    const result = await onSubmit({
      name: cleanName,
      surah,
      verse: checked.verse,
      verseEnd: checked.verseEnd,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Field
        label="Circle name"
        value={name}
        onChangeText={setName}
        maxLength={CIRCLE_NAME_MAX}
        placeholder="Friday friends"
        autoCapitalize="words"
        returnKeyType="done"
      />

      <ChoiceField
        label="Surah"
        text={surahText}
        chosen={!!meta}
        accessibilityLabel={
          meta ? `Surah: ${meta.name}. Change surah` : "Choose a surah"
        }
        disabled={surahs.length === 0}
        onPress={() => setPicking("surah")}
      />

      <ChoiceField
        label="This week"
        text={portionText}
        chosen
        accessibilityLabel={`This week: ${portionText}. Change verses`}
        disabled={surah === null}
        onPress={() => setPicking("portion")}
      />

      <FormError message={error} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        <Button title={submitTitle} busy={busy} onPress={() => void submit()} />
        {onCancel ? (
          <Button kind="ghost" title="Cancel" onPress={onCancel} />
        ) : null}
      </View>

      {picking === "surah" ? (
        <SurahPicker
          surahs={surahs}
          selected={surah}
          onClose={() => setPicking(null)}
          onPick={(s) => {
            if (s.number !== surah) {
              setPortion("");
            }
            setSurah(s.number);
            setPicking(null);
          }}
        />
      ) : null}
      {picking === "portion" ? (
        <PortionPicker
          choices={portionChoices(surahPassages, portion)}
          selected={portion}
          onClose={() => setPicking(null)}
          onPick={(value) => {
            setPortion(value);
            setPicking(null);
          }}
        />
      ) : null}
    </View>
  );
}

function ChoiceField({
  label,
  text,
  chosen,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  text: string;
  chosen: boolean;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text
        variant="eyebrow"
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.indigoWash : colors.cottonRaised,
          borderColor: colors.lineStrong,
          borderRadius: radius.sm,
          borderWidth: 1,
          justifyContent: "center",
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 10,
        })}
      >
        <Text
          style={{
            color: chosen ? colors.ink : colors.inkFaint,
            fontFamily: fonts.read,
          }}
        >
          {text}
        </Text>
      </Pressable>
    </View>
  );
}
