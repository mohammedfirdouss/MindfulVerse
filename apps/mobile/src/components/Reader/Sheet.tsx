import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, radius, space, useTheme } from "../../theme";
import { Text } from "../../ui";

/** Bottom sheet (web components/Sheet.tsx): dimmed backdrop, tap outside or
 *  Android back to close, scrolling body. */
export function Sheet({
  title,
  label,
  onClose,
  children,
}: {
  title: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.indigoDeep, opacity: 0.55 }}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={{
            maxHeight: "85%",
            backgroundColor: colors.cottonRaised,
            borderTopLeftRadius: radius.md * 2,
            borderTopRightRadius: radius.md * 2,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: space.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <Text variant="h2" style={{ flex: 1, fontSize: 19, lineHeight: 26 }}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
              <Text style={{ fontFamily: fonts.read, color: colors.indigo }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
