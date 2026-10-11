// Port of apps/web/src/components/ReaderTools.tsx: one quiet row under the
// title plate — the numbered diamond ("Go to a verse") and "Aa" ("Reading
// settings") — and the two sheets they open. The open sheet is owned by the
// screen, not this row: the list header remounts when the view changes, and
// the settings sheet must stay open through that.
import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import type { ReadView } from "@mindfulverse/core/readingPrefs";
import { fonts, space, useTheme } from "../../theme";
import Svg, { Path } from "react-native-svg";
import { Button, Sheet, Text } from "../../ui";
import { JumpToVerse } from "./JumpToVerse";
import { ReadingControls } from "./ReadingControls";

export type ReaderPanel = "display" | "jump" | null;

export function ReaderToolbar({ onOpen }: { onOpen: (p: Exclude<ReaderPanel, null>) => void }) {
  const { colors } = useTheme();
  const tool = ({ pressed }: { pressed: boolean }) => ({
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: pressed ? colors.indigoWash : "transparent",
    transform: [{ scale: pressed ? 0.94 : 1 }],
  });
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: space.xs, paddingTop: 6, paddingBottom: 2 }}>
      <Pressable
        onPress={() => onOpen("jump")}
        accessibilityRole="button"
        accessibilityLabel="Go to a verse"
        hitSlop={4}
        style={tool}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}
        >
          {/* The adire verse diamond (ui Diamond), with a numeral-sized "#". */}
          <Svg width={30} height={30} style={{ position: "absolute" }}>
            <Path d="M15 1.5 L28.5 15 L15 28.5 L1.5 15Z" fill="none" stroke={colors.indigo} strokeWidth={1.6} />
          </Svg>
          <Text style={{ fontFamily: fonts.readSemiBold, fontSize: 13, lineHeight: 16, color: colors.indigo }}>#</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onOpen("display")}
        accessibilityRole="button"
        accessibilityLabel="Reading settings"
        hitSlop={4}
        style={tool}
      >
        <Text
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{ fontFamily: fonts.readSemiBold, fontSize: 18, lineHeight: 24, color: colors.indigo }}
        >
          Aa
        </Text>
      </Pressable>
    </View>
  );
}

export function ReadingSettingsSheet({
  onClose,
  sizeKey,
  onSize,
  view,
  onView,
}: {
  onClose: () => void;
  sizeKey: string;
  onSize: (k: string) => void;
  view: ReadView;
  onView: (v: ReadView) => void;
}) {
  return (
    <Sheet label="Reading settings" title="Reading settings" onClose={onClose} scroll>
      <ReadingControls sizeKey={sizeKey} onSize={onSize} view={view} onView={onView} />
      <View style={{ alignItems: "flex-start", paddingTop: space.xl }}>
        <Button title="Done" kind="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}

export function JumpSheet({ onClose, max, onJump }: { onClose: () => void; max: number; onJump: (n: number) => void }) {
  const lift = useKeyboardLift();
  return (
    <Sheet label="Go to a verse" title="Go to a verse" onClose={onClose} scroll>
      <JumpToVerse max={max} onJump={onJump} />
      <View style={{ height: lift }} />
    </Sheet>
  );
}

/** iOS doesn't resize a Modal for the keyboard (Android's modal window does),
 *  so the short jump sheet grows by the keyboard's height to stay above it. */
function useKeyboardLift(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}
