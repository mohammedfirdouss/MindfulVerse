// The surah picker for tadabbur (web: the "By surah" half of pages/Sessions.tsx).
// Home's "Choose another surah" lands here, so a chosen surah opens in tadabbur
// rather than in the reader.
import { loadSurahs } from "@mindfulverse/core/data";
import { getLocalProgress } from "@mindfulverse/core/progress";
import type { SurahMeta } from "@mindfulverse/core/types";
import { Stack, useFocusEffect } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ActivityIndicator, FlatList, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IndexDivider } from "../../src/components/Reader/IndexRows";
import { fonts, radius, space, useTheme } from "../../src/theme";
import { Button, Card, Diamond, LinkPressable, Text } from "../../src/ui";
import { ChevronIcon } from "../../src/ui/icons";

type Status = "loading" | "ready" | "error";

const readPondered = () => getLocalProgress().surahTadabbur;

const PickerRow = memo(
  ({ surah, pondered }: { surah: SurahMeta; pondered: number | null }) => {
    const { colors } = useTheme();
    const detail = `${surah.ayahCount} verses${pondered === null ? "" : `, at verse ${pondered}`}`;
    return (
      <LinkPressable
        href={{
          params: { surah: String(surah.number) },
          pathname: "/tadabbur/[surah]",
        }}
        accessibilityLabel={`Surah ${surah.number}, ${surah.name}, ${detail}`}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: pressed ? colors.indigoWash : "transparent",
          borderRadius: radius.md,
          flexDirection: "row",
          gap: 14,
          marginHorizontal: -space.sm,
          minHeight: 56,
          paddingHorizontal: space.sm,
          paddingVertical: 10,
        })}
      >
        <Diamond label={surah.number} size={40} tone="outline" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: fonts.readSemiBold,
              fontSize: 17.5,
              lineHeight: 24,
            }}
          >
            {surah.name}
          </Text>
          <Text variant="muted" style={{ fontSize: 14, lineHeight: 20 }}>
            {detail}
          </Text>
        </View>
        <ChevronIcon color={colors.inkFaint} />
      </LinkPressable>
    );
  }
);

export default function TadabburPicker() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [pondered, setPondered] = useState(readPondered);

  // Progress changes inside the tadabbur screen; re-read it on return. One
  // read of the whole map per visit, not one per row.
  useFocusEffect(useCallback(() => setPondered(readPondered()), []));

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadSurahs()
      .then((list) => {
        if (active) {
          setSurahs(list);
          setStatus("ready");
        }
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [attempt]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return surahs;
    }
    return surahs.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.number) === q
    );
  }, [surahs, query]);

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Text variant="soft">Its background, then verse by verse.</Text>
      {status === "ready" ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find a surah by name or number"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Find a surah by name or number"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            backgroundColor: colors.cottonRaised,
            borderColor: colors.line,
            borderRadius: radius.md,
            borderWidth: 1,
            color: colors.ink,
            fontFamily: fonts.read,
            fontSize: 17,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />
      ) : null}
    </View>
  );

  let empty: ReactElement;
  if (status === "loading") {
    empty = (
      <View
        style={{ alignItems: "center", flexDirection: "row", gap: space.sm }}
        accessible
        accessibilityLabel="Gathering the surahs"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator color={colors.indigo} />
        <Text variant="muted">Gathering the surahs…</Text>
      </View>
    );
  } else if (status === "error") {
    empty = (
      <Card>
        <View style={{ alignItems: "flex-start", gap: space.md }}>
          <Text variant="soft">The surahs aren’t available right now.</Text>
          <Button
            kind="secondary"
            title="Try again"
            onPress={() => setAttempt((n) => n + 1)}
          />
        </View>
      </Card>
    );
  } else {
    empty = <Text variant="muted">No surah matches that.</Text>;
  }

  return (
    <View style={{ backgroundColor: colors.cotton, flex: 1 }}>
      <Stack.Screen options={{ title: "Tadabbur" }} />
      <FlatList
        data={status === "ready" ? filtered : []}
        extraData={pondered}
        keyExtractor={(s) => String(s.number)}
        renderItem={({ item }) => (
          <PickerRow
            surah={item}
            pondered={pondered[String(item.number)]?.ayah ?? null}
          />
        )}
        ItemSeparatorComponent={IndexDivider}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        initialNumToRender={12}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom: insets.bottom + space.xxl,
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
        }}
      />
    </View>
  );
}
