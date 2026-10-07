// Web's components/Sheet.tsx on RN: a bottom sheet over an ink backdrop,
// shared by the Reader (verse + commentary) and Tadabbur (go to a verse).
// Built on Modal (no gesture/bottom-sheet dependency): tapping the backdrop,
// the ✕, or the Android back button closes it. The header (handle, title, ✕)
// stays fixed; the body is the caller's list (`scroll={false}`, the default)
// or plain content wrapped in a padded ScrollView (`scroll`).
//
// Bottom inset: the modal window is drawn edge to edge on Android
// (statusBarTranslucent + navigationBarTranslucent; SDK 57 apps are
// edge-to-edge), so the sheet pads by the safe-area bottom inset itself:
// ~48 dp above the 3-button bar, the small gesture-bar inset with gesture
// navigation (floored at space.sm so content never touches the edge when a
// device reports 0), and the home indicator on iOS. Without the translucent
// nav bar the window would stop above the bar and that padding would double.
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radius, space, useTheme } from "../theme";
import { Text } from "./Text";

export function Sheet({
  visible = true,
  label,
  title,
  onClose,
  scroll = false,
  children,
}: {
  /** Defaults to true, for sheets mounted only while open. */
  visible?: boolean;
  /** Accessible name of the dialog, e.g. "Go to a verse". */
  label: string;
  title: string;
  onClose: () => void;
  /** Wrap the body in a padded ScrollView (text content); leave false when
   *  the body brings its own FlatList. */
  scroll?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, opacity: 0.4 }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          importantForAccessibility="no"
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={{
            maxHeight: "85%",
            backgroundColor: colors.cottonRaised,
            borderTopLeftRadius: radius.md * 3,
            borderTopRightRadius: radius.md * 3,
            paddingBottom: Math.max(insets.bottom, space.sm),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              marginTop: space.sm,
              backgroundColor: colors.lineStrong,
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: space.lg,
              paddingRight: space.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <Text variant="eyebrow" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
              hitSlop={8}
              style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.read, fontSize: 20, color: colors.inkSoft }}>✕</Text>
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl }}>{children}</ScrollView>
          ) : (
            children
          )}
        </View>
      </View>
    </Modal>
  );
}
