// Surah reader — port of apps/web/src/pages/Surah.tsx.
// Translation view: one FlatList row per ayah. Reading view (Arabic only,
// flowing): rows are paragraphs of a few ayahs (src/components/Reader/chunks).
// Last-read follows the topmost visible row (web: IntersectionObserver;
// here: onViewableItemsChanged + the same 800 ms debounce).
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View, type ListRenderItem, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadSurahAyahs, loadSurahs, loadTafsirIndex } from "@mindfulverse/core/data";
import { recordLastRead } from "@mindfulverse/core/progress";
import {
  getReadView,
  getSizeKey,
  saveReadView,
  saveSizeKey,
  scaleFor,
  type ReadView,
} from "@mindfulverse/core/readingPrefs";
import type { Ayah, SurahMeta } from "@mindfulverse/core/types";
import { chunkAyahs, rowIndexFor, type ReadingChunk } from "../../src/components/Reader/chunks";
import { BASMALAH, parseVerseParam, showsBasmalah, type TafsirIndex } from "../../src/components/Reader/commentary";
import { JumpToVerse } from "../../src/components/Reader/JumpToVerse";
import { createLastReadScheduler, topmostRow } from "../../src/components/Reader/lastRead";
import { ReadingControls } from "../../src/components/Reader/ReadingControls";
import { ReadingParagraph } from "../../src/components/Reader/ReadingParagraph";
import { CommentarySheet, VerseSheet } from "../../src/components/Reader/Sheets";
import { useTafsir } from "../../src/components/Reader/useTafsir";
import { VerseRow } from "../../src/components/Reader/VerseRow";
import { TitlePlate } from "../../src/components/Reader/TitlePlate";
import { space, useTheme } from "../../src/theme";
import { ArabicText, Button, Card, DyeRule, Text } from "../../src/ui";

type Status = "loading" | "ready" | "error";

type Row =
  | { kind: "verse"; key: string; first: number; last: number; ayah: Ayah }
  | { kind: "chunk"; key: string; first: number; last: number; chunk: ReadingChunk };

const FLASH_MS = 1600;
// RN 0.86 requires exactly one threshold; 1% keeps the old "any part visible" behaviour.
const VIEWABILITY = { minimumViewTime: 100, itemVisiblePercentThreshold: 1 } as const;

// Keyed on the surah (as web) so "Next surah" or a new deep link starts from
// clean state; an in-flight load can't land on the wrong surah.
export default function SurahRoute() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  return <SurahReader key={surah} surah={surah} />;
}

function SurahReader({ surah }: { surah: string }) {
  const { v } = useLocalSearchParams<{ v?: string }>();
  const surahNumber = Number(surah);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [index, setIndex] = useState<TafsirIndex | null>(null);
  const [meta, setMeta] = useState<SurahMeta | undefined>(undefined);
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<ReadView>(getReadView);
  const [sizeKey, setSizeKey] = useState<string>(getSizeKey);
  const [openAyah, setOpenAyah] = useState<Ayah | null>(null);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const tafsir = useTafsir();
  const scale = scaleFor(sizeKey);

  useEffect(() => {
    let active = true;
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    // Only the ~6 KB tafsir index loads here; commentary text loads on tap.
    Promise.all([
      loadSurahAyahs(surahNumber),
      loadTafsirIndex().catch<Record<string, number[]> | null>(() => null),
      loadSurahs().catch<SurahMeta[]>(() => []),
    ])
      .then(([ayahData, indexData, surahList]) => {
        if (!active) return;
        setAyahs(ayahData);
        setIndex(indexData);
        setMeta(surahList.find((s) => s.number === surahNumber));
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [surahNumber]);

  const chunks = useMemo(() => chunkAyahs(ayahs), [ayahs]);
  const rows = useMemo<Row[]>(
    () =>
      view === "reading"
        ? chunks.map((c) => ({ kind: "chunk", key: c.key, first: c.first, last: c.last, chunk: c }))
        : ayahs.map((a) => ({ kind: "verse", key: a.verseKey, first: a.ayah, last: a.ayah, ayah: a })),
    [view, chunks, ayahs],
  );

  // ---- last-read tracking -------------------------------------------------
  const [scheduler] = useState(() => createLastReadScheduler((a) => recordLastRead(surahNumber, a)));
  useEffect(() => () => scheduler.cancel(), [scheduler]);
  const topRef = useRef<number | null>(null);
  // FlatList requires a stable callback; it only touches refs/stable values.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Row>[] }) => {
    const visible = viewableItems.filter((t) => t.isViewable && t.item).map((t) => t.item);
    const top = topmostRow(visible);
    if (top !== null) topRef.current = top.first;
    scheduler.update(visible);
  }).current;

  // ---- scrolling to a verse -------------------------------------------------
  const listRef = useRef<FlatList<Row>>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const pending = useRef<{ index: number; tries: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const scrollToAyah = useCallback((n: number, animated: boolean) => {
    const i = rowIndexFor(rowsRef.current, n);
    if (i < 0) return;
    pending.current = { index: i, tries: 0 };
    listRef.current?.scrollToIndex({ index: i, animated, viewPosition: 0 });
  }, []);

  // Rows far down (2:255) aren't measured yet: jump to an estimate so they
  // render, then retry the exact index.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const p = pending.current;
      if (!p || p.tries >= 8) return;
      p.tries += 1;
      listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      later(() => listRef.current?.scrollToIndex({ index: p.index, animated: false, viewPosition: 0 }), 60);
    },
    [later],
  );

  const flash = useCallback(
    (n: number) => {
      setFlashKey(`${surahNumber}:${n}`);
      later(() => setFlashKey(null), FLASH_MS);
    },
    [later, surahNumber],
  );

  // Deep link (?v=n): scroll there once the surah renders; it counts as read.
  useEffect(() => {
    if (status !== "ready") return;
    const n = parseVerseParam(v, ayahs.length);
    if (n === null) return;
    later(() => scrollToAyah(n, false), 0);
    recordLastRead(surahNumber, n);
    scheduler.noteRecorded(n);
    flash(n);
  }, [status, v, ayahs.length, surahNumber, scrollToAyah, scheduler, flash, later]);

  const goToVerse = useCallback(
    (n: number) => {
      scrollToAyah(n, true);
      recordLastRead(surahNumber, n);
      scheduler.noteRecorded(n);
      flash(n);
    },
    [scrollToAyah, surahNumber, scheduler, flash],
  );

  // Swapping views keeps your place (web re-runs the ?v= jump instead).
  const keepPlace = useRef<number | null>(null);
  const chooseView = useCallback((next: ReadView) => {
    keepPlace.current = topRef.current;
    setView(next);
    saveReadView(next);
  }, []);
  useEffect(() => {
    const n = keepPlace.current;
    keepPlace.current = null;
    if (n !== null && n > 1) later(() => scrollToAyah(n, false), 0);
  }, [view, later, scrollToAyah]);

  const chooseSize = useCallback((k: string) => {
    setSizeKey(k);
    saveSizeKey(k);
  }, []);

  // ---- rendering ------------------------------------------------------------
  const activeKey = selected?.verseKey ?? flashKey;
  const activeAyah = activeKey ? Number(activeKey.split(":")[1]) : null;

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({ item }) =>
      item.kind === "verse" ? (
        <VerseRow
          ayah={item.ayah}
          scale={scale}
          index={index}
          flash={flashKey === item.ayah.verseKey}
          onCommentary={setOpenAyah}
        />
      ) : (
        <ReadingParagraph
          chunk={item.chunk}
          scale={scale}
          activeAyah={activeAyah !== null && activeAyah >= item.first && activeAyah <= item.last ? activeAyah : null}
          onSelect={setSelected}
        />
      ),
    [scale, index, flashKey, activeAyah],
  );

  const header = useMemo(
    () => (
      <View style={{ paddingTop: space.md }}>
        <TitlePlate surah={surahNumber} name={meta?.name} ayahCount={meta?.ayahCount} />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space.md,
            paddingTop: space.md,
            paddingBottom: space.md,
            marginBottom: 4,
          }}
        >
          <ReadingControls sizeKey={sizeKey} onSize={chooseSize} view={view} onView={chooseView} />
          <JumpToVerse max={meta?.ayahCount ?? ayahs.length} onJump={goToVerse} />
        </View>
        {showsBasmalah(surahNumber) ? (
          <View style={{ paddingTop: 6 }}>
            <DyeRule />
            <ArabicText
              scale={scale * (view === "reading" ? 1.7 / 1.9 : 1)}
              style={{ textAlign: "center", paddingTop: 10, paddingBottom: 4 }}
            >
              {BASMALAH}
            </ArabicText>
          </View>
        ) : null}
      </View>
    ),
    [meta, sizeKey, chooseSize, view, chooseView, ayahs.length, goToVerse, surahNumber, scale],
  );

  const footer = useMemo(
    () =>
      surahNumber < 114 ? (
        <View style={{ paddingTop: 28, paddingBottom: 8, alignItems: "flex-start" }}>
          <Button
            title="Next surah"
            kind="secondary"
            onPress={() => router.replace({ pathname: "/read/[surah]", params: { surah: String(surahNumber + 1) } })}
          />
        </View>
      ) : null,
    [surahNumber],
  );

  const title = meta ? meta.name : Number.isInteger(surahNumber) ? `Surah ${surahNumber}` : "Read";

  return (
    <View style={{ flex: 1, backgroundColor: colors.cotton }}>
      <Stack.Screen options={{ title }} />

      {status === "loading" ? (
        <View style={{ padding: space.lg, flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <ActivityIndicator color={colors.indigo} />
          <Text variant="muted">Loading…</Text>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={{ padding: space.lg }}>
          <Card>
            <Text variant="soft">This surah isn’t ready to read yet. Please check back soon.</Text>
          </Card>
        </View>
      ) : null}

      {status === "ready" ? (
        <FlatList
          // Remount per view: rows change type and height entirely.
          key={view}
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          onScrollToIndexFailed={onScrollToIndexFailed}
          initialNumToRender={view === "reading" ? 4 : 5}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={40}
          windowSize={9}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: insets.bottom + space.xxl,
          }}
        />
      ) : null}

      {openAyah ? (
        <CommentarySheet ayah={openAyah} index={index} tafsir={tafsir} onClose={() => setOpenAyah(null)} />
      ) : null}
      {selected ? (
        <VerseSheet ayah={selected} index={index} tafsir={tafsir} onClose={() => setSelected(null)} />
      ) : null}
    </View>
  );
}

