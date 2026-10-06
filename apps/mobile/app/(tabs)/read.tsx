// Read tab — port of apps/web/src/pages/Reader.tsx: continue-reading card,
// Surah / Juz browse, search by name or number.
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadDivisions, loadSurahs } from "@mindfulverse/core/data";
import { getLastRead, type LastRead } from "@mindfulverse/core/progress";
import type { Division, SurahMeta } from "@mindfulverse/core/types";
import { JuzRow, SurahRow, verseHref } from "../../src/components/Reader/IndexRows";
import { Segmented } from "../../src/components/Reader/Segmented";
import { fonts, radius, space, useTheme } from "../../src/theme";
import { Card, Text } from "../../src/ui";

type Status = "loading" | "ready" | "error";
type Tab = "surah" | "juz";

function Separator() {
  return <View style={{ height: space.md }} />;
}

export default function Read() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "juz" ? "juz" : "surah");

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const [juzList, setJuzList] = useState<Division[]>([]);
  const [hizbList, setHizbList] = useState<Division[]>([]);
  const [juzFailed, setJuzFailed] = useState(false);

  // Progress isn't reactive: re-read whenever the tab regains focus.
  const [lastRead, setLastRead] = useState<LastRead | null>(getLastRead);
  useFocusEffect(useCallback(() => setLastRead(getLastRead()), []));

  useEffect(() => {
    let active = true;
    setStatus("loading");
    loadSurahs()
      .then((data) => {
        if (!active) return;
        setSurahs(data);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  // divisions.json loads the first time the Juz tab opens (web: on mount).
  const wantJuz = tab === "juz";
  useEffect(() => {
    if (!wantJuz || juzList.length > 0) return;
    let active = true;
    setJuzFailed(false);
    loadDivisions()
      .then((d) => {
        if (!active) return;
        setJuzList(d.juz);
        setHizbList(d.hizb);
      })
      .catch(() => active && setJuzFailed(true));
    return () => {
      active = false;
    };
  }, [wantJuz, juzList.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter((s) => s.name.toLowerCase().includes(q) || String(s.number).includes(q));
  }, [surahs, query]);

  const names = useMemo(() => new Map(surahs.map((s) => [s.number, s.name])), [surahs]);
  const nameOf = useCallback((s: number) => names.get(s) ?? `Surah ${s}`, [names]);

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <View>
        <Text variant="eyebrow">Read</Text>
        <Text variant="h1">The Qur’an</Text>
        <Text variant="muted">Browse by surah or by juz.</Text>
      </View>

      {lastRead ? (
        <Link href={verseHref(lastRead.surah, lastRead.ayah)} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Continue reading ${nameOf(lastRead.surah)}, verse ${lastRead.ayah}`}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.indigoWash : colors.shea,
              borderRadius: radius.md,
              padding: space.lg,
            })}
          >
            <Text variant="eyebrow">Continue reading</Text>
            <Text style={{ fontFamily: fonts.readSemiBold }}>
              {nameOf(lastRead.surah)} · verse {lastRead.ayah}
            </Text>
          </Pressable>
        </Link>
      ) : null}

      <View style={{ alignItems: "flex-start" }}>
        <Segmented<Tab>
          accessibilityLabel="Browse by"
          value={tab}
          onChange={setTab}
          options={[
            { key: "surah", label: "Surah", accessibilityLabel: "Browse by surah" },
            { key: "juz", label: "Juz", accessibilityLabel: "Browse by juz" },
          ]}
        />
      </View>

      {tab === "surah" && status === "ready" ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or number…"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel="Search surahs"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.cottonRaised,
            color: colors.ink,
            fontFamily: fonts.read,
            fontSize: 17,
          }}
        />
      ) : null}
    </View>
  );

  const contentStyle = {
    paddingHorizontal: space.lg,
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + space.xxl,
  };

  let empty: ReactElement | null = null;
  if (tab === "surah") {
    if (status === "loading") empty = <Loading label="Loading surahs…" />;
    else if (status === "error")
      empty = (
        <Card>
          <Text variant="muted">Content is being prepared. Please check back soon.</Text>
        </Card>
      );
    else empty = <Text variant="muted">No surahs match “{query}”.</Text>;
  } else if (juzFailed) {
    empty = (
      <Card>
        <Text variant="muted">Juz browsing isn’t available right now.</Text>
      </Card>
    );
  } else {
    empty = <Loading label="Loading juz…" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cotton }}>
      {tab === "surah" ? (
        <FlatList
          key="surah"
          data={status === "ready" ? filtered : []}
          keyExtractor={(s) => String(s.number)}
          renderItem={({ item }) => <SurahRow surah={item} />}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={contentStyle}
        />
      ) : (
        <FlatList
          key="juz"
          data={juzList}
          keyExtractor={(j) => String(j.n)}
          renderItem={({ item }) => (
            <JuzRow
              juz={item}
              hizbs={hizbList.filter((h) => h.n === item.n * 2 - 1 || h.n === item.n * 2)}
              nameOf={nameOf}
            />
          )}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          initialNumToRender={8}
          contentContainerStyle={contentStyle}
        />
      )}
    </View>
  );
}

function Loading({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
      <ActivityIndicator color={colors.indigo} />
      <Text variant="muted">{label}</Text>
    </View>
  );
}
