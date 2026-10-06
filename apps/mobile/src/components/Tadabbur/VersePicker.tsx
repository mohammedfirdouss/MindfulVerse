// "Go to a verse": every verse of the surah in a bottom sheet, so a long
// surah (286 ayahs) can be entered anywhere without paging through it.
// FlatList with fixed-height memoized rows (getItemLayout), opened scrolled
// to the current verse.
import { memo, useCallback } from "react";
import { FlatList, Pressable, View, type ListRenderItem } from "react-native";
import type { Ayah } from "@mindfulverse/core/types";
import { fonts, space, useTheme } from "../../theme";
import { Text } from "../../ui";
import { Sheet } from "./Sheet";

const ROW_HEIGHT = 56;

const Row = memo(function Row({
  ayah,
  current,
  onPick,
}: {
  ayah: Ayah;
  current: boolean;
  onPick: (ayah: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onPick(ayah.ayah)}
      accessibilityRole="button"
      accessibilityLabel={`Verse ${ayah.ayah}: ${ayah.translation}`}
      accessibilityState={{ selected: current }}
      style={({ pressed }) => ({
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.lg,
        backgroundColor: current || pressed ? colors.indigoWash : "transparent",
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      })}
    >
      <Text style={{ width: 36, fontFamily: fonts.readSemiBold, color: colors.indigo, textAlign: "right" }}>
        {ayah.ayah}
      </Text>
      <Text variant="soft" numberOfLines={1} style={{ flex: 1 }}>
        {ayah.translation}
      </Text>
    </Pressable>
  );
});

const getItemLayout = (_: ArrayLike<Ayah> | null | undefined, index: number) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
});
const keyOf = (a: Ayah) => a.verseKey;

export function VersePicker({
  visible,
  ayahs,
  currentAyah,
  onPick,
  onClose,
}: {
  visible: boolean;
  ayahs: Ayah[];
  /** 1-based; the row to highlight and open at. */
  currentAyah: number;
  onPick: (ayah: number) => void;
  onClose: () => void;
}) {
  const renderItem = useCallback<ListRenderItem<Ayah>>(
    ({ item }) => <Row ayah={item} current={item.ayah === currentAyah} onPick={onPick} />,
    [currentAyah, onPick],
  );
  const initial = Math.max(0, Math.min(ayahs.length - 1, currentAyah - 3));
  return (
    <Sheet visible={visible} label="Go to a verse" title="Go to a verse" onClose={onClose}>
      {visible ? (
        <FlatList
          data={ayahs}
          keyExtractor={keyOf}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialScrollIndex={initial}
          initialNumToRender={14}
          windowSize={7}
          extraData={currentAyah}
          ListFooterComponent={<View style={{ height: space.sm }} />}
        />
      ) : null}
    </Sheet>
  );
}
