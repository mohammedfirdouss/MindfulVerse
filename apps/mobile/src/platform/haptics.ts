// Light touch feedback. Never awaited, never throws: haptics are a nicety, and
// the browser design preview has none.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

/** A choice changed: tabs, segmented controls, steppers. */
export function tickSelection(): void {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

/** A primary action was pressed. */
export function tapLight(): void {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Something was saved or completed. */
export function tapSuccess(): void {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
