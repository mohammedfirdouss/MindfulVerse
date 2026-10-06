// Web's components/Sheet.tsx on RN: a bottom sheet over a dimmed backdrop.
// Built on Modal (no gesture/bottom-sheet dependency): tapping the backdrop,
// the ✕, or the Android back button closes it. The header (title + ✕) stays
// fixed; the body is whatever the caller passes (a ScrollView or FlatList).
import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radius, space, useTheme } from "../../theme";
import { Text } from "../../ui";

export function Sheet({
  visible,
  label,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  /** Accessible name of the dialog, e.g. "Go to a verse". */
  label: string;
  title: string;
  onClose: () => void;
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
            maxHeight: "80%",
            backgroundColor: colors.cottonRaised,
            borderTopLeftRadius: radius.md * 3,
            borderTopRightRadius: radius.md * 3,
            paddingBottom: insets.bottom,
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
          {children}
        </View>
      </View>
    </Modal>
  );
}
